import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useMonsterBrowse, useMonster, useMonsterSources } from '../../api/useMonsters';
import useCombatStore from '../../store/useCombatStore';
import useUIStore from '../../store/useUIStore';
import useUserDataStore from '../../store/useUserDataStore';
import SOURCE_BADGES from '../../constants/monsterSources';
import PF2E_SOURCE_BADGES from '../../constants/pf2eSources';

const CR_OPTIONS_5E = [
  '0', '1/8', '1/4', '1/2', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23',
  '24', '25', '26', '27', '28', '29', '30',
];

const LEVEL_OPTIONS_PF2E = [
  '-1', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '25',
];

const PAGE_SIZE = 20;

const MonsterDatabase = forwardRef(function MonsterDatabase({ gameSystem = '5e', onRollDice, onAddToEncounter }, ref) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [crFilter, setCrFilter] = useState('');
  const [page, setPage] = useState(0);
  const [selectedSlug, setSelectedSlug] = useState(null);
  const timerRef = useRef(null);

  const addCombatant = useCombatStore(s => s.addCombatant);
  const openModal = useUIStore(s => s.openModal);
  const openEditMonster = useUIStore(s => s.openEditMonster);
  const storeMonsters = useUserDataStore(s => s.customMonsters);
  const removeCustomMonster = useUserDataStore(s => s.removeCustomMonster);

  const isPf2e = gameSystem === 'pf2e';
  const sourceBadges = isPf2e ? PF2E_SOURCE_BADGES : SOURCE_BADGES;
  const crLevelOptions = isPf2e ? LEVEL_OPTIONS_PF2E : CR_OPTIONS_5E;
  const crLabel = isPf2e ? 'Level' : 'CR';
  const crAllLabel = isPf2e ? 'All Levels' : 'All CRs';

  // Allow parent to open a stat block by slug or refresh local monsters
  useImperativeHandle(ref, () => ({
    showStatBlock(slug) { setSelectedSlug(slug); },
    refreshLocal() { /* no-op, store auto-updates */ },
  }), []);
  const { data: sources = [] } = useMonsterSources(gameSystem);

  // Debounce
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(0);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  function handleSourceFilter(val) { setSourceFilter(val); setPage(0); }
  function handleCrFilter(val) { setCrFilter(val); setPage(0); }

  const { data, isLoading } = useMonsterBrowse({
    q: debouncedQuery,
    source: sourceFilter,
    cr: crFilter,
    gameSystem,
    limit: PAGE_SIZE,
    skip: page * PAGE_SIZE,
  });

  const apiResults = data?.results || [];
  const apiTotal = data?.total || 0;
  // Filter store custom monsters by search/CR
  const localMonsters = (!sourceFilter || sourceFilter === 'custom' || sourceFilter === 'custom-pf2e')
    ? storeMonsters.filter(m => {
        const monsterSystem = m.gameSystem || '5e';
        if (monsterSystem !== gameSystem) return false;
        if (debouncedQuery) {
          const pattern = new RegExp(debouncedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          if (!pattern.test(m.name)) return false;
        }
        if (crFilter && m.cr !== crFilter) return false;
        return true;
      }).sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const results = sourceFilter === 'custom'
    ? localMonsters
    : [...localMonsters, ...apiResults];
  const total = sourceFilter === 'custom'
    ? localMonsters.length
    : apiTotal + localMonsters.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const isCustomSlug = storeMonsters.some(m => m.slug === selectedSlug);
  const { data: apiMonster, isLoading: loadingApiDetail } = useMonster(isCustomSlug ? null : selectedSlug);
  const storeDetailMonster = isCustomSlug ? storeMonsters.find(m => m.slug === selectedSlug) : null;
  const selectedMonster = isCustomSlug ? storeDetailMonster : apiMonster;
  const loadingDetail = isCustomSlug ? false : loadingApiDetail;

  const handleDeleteMonster = useCallback((slug) => {
    try {
      removeCustomMonster(slug);
      setSelectedSlug(null);
    } catch {
      window.alert('Failed to delete monster.');
    }
  }, [removeCustomMonster]);

  const handleAddToEncounter = useCallback((monster) => {
    if (onAddToEncounter) {
      onAddToEncounter(monster);
    } else {
      addCombatant({
        name: monster.name,
        maxHP: monster.hp || 1,
        ac: monster.ac || 10,
        initMod: monster.initMod || 0,
        type: 'monster',
        quantity: 1,
        monsterSlug: monster.slug,
      });
    }
  }, [addCombatant, onAddToEncounter]);

  // If viewing a stat block, show detail view
  if (selectedSlug) {
    return (
      <MonsterDetail
        monster={selectedMonster}
        loading={loadingDetail}
        onBack={() => setSelectedSlug(null)}
        onRollDice={onRollDice}
        onDelete={isCustomSlug ? handleDeleteMonster : undefined}
        onEdit={isCustomSlug ? (monster) => openEditMonster(monster) : undefined}
      />
    );
  }

  return (
    <div className="monster-db">
      <div className="monster-db__filters">
        <input
          type="text"
          className="monster-db__search"
          placeholder="Search by name..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <div className="monster-db__filter-row">
          <select
            className="monster-db__select"
            value={sourceFilter}
            onChange={e => handleSourceFilter(e.target.value)}
          >
            <option value="">All Sources</option>
            {sources.map(s => (
              <option key={s.key} value={s.key}>
                {s.label} ({s.count})
              </option>
            ))}
          </select>
          <select
            className="monster-db__select"
            value={crFilter}
            onChange={e => handleCrFilter(e.target.value)}
          >
            <option value="">{crAllLabel}</option>
            {crLevelOptions.map(val => (
              <option key={val} value={val}>{crLabel} {val}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="monster-db__custom-actions">
        <button
          className="btn btn--sm btn--primary"
          onClick={() => openModal('monster-form', { gameSystem })}
        >
          + Create {isPf2e ? 'Creature' : 'Monster'}
        </button>
        <button
          className="btn btn--sm"
          onClick={() => openModal('import-monster', { gameSystem })}
        >
          &#8595; Import JSON
        </button>
      </div>

      <div className="monster-db__count">
        {isLoading ? 'Searching...' : `${total.toLocaleString()} monsters found`}
      </div>

      <div className="monster-db__list">
        {results.map(m => (
          <div
            key={m.slug}
            className="monster-db__item"
            onClick={() => setSelectedSlug(m.slug)}
          >
            <div className="monster-db__item-main">
              <span className="monster-db__item-name">{m.name}</span>
              <span className="monster-db__item-meta">
                {m.size} {m.type}
                {m.alignment ? ` \u2022 ${m.alignment}` : ''}
              </span>
            </div>
            <div className="monster-db__item-stats">
              <span className="monster-db__stat" title={isPf2e ? 'Level' : 'Challenge Rating'}>
                {isPf2e ? `Lvl ${m.cr || '—'}` : `CR ${m.cr || '—'}`}
              </span>
              <span className="monster-db__stat" title="Hit Points">
                HP {m.hp}
              </span>
              <span className="monster-db__stat" title="Armor Class">
                AC {m.ac}
              </span>
              <span className="monster-search__source-badge">
                {sourceBadges[m.sourceKey] || m.sourceKey}
              </span>
            </div>
            <button
              className="monster-db__add-btn"
              title="Add to encounter"
              aria-label={`Add ${m.name} to encounter`}
              onClick={e => { e.stopPropagation(); handleAddToEncounter(m); }}
            >
              +
            </button>
          </div>
        ))}

        {!isLoading && results.length === 0 && (
          <div className="monster-db__empty">No monsters match your filters.</div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="monster-db__pagination">
          <button
            className="btn btn--sm"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            &laquo; Prev
          </button>
          <span className="monster-db__page-info">
            Page {page + 1} of {totalPages}
          </span>
          <button
            className="btn btn--sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >
            Next &raquo;
          </button>
        </div>
      )}
    </div>
  );
});

export default MonsterDatabase;

/* ── Stat Block Detail View ─────────────────────────────────── */

function MonsterDetail({ monster, loading, onBack, onRollDice, onDelete, onEdit }) {
  const detailRef = useRef(null);

  // After render, attach click handlers to dice notation
  useEffect(() => {
    if (!detailRef.current || !onRollDice) return;

    const el = detailRef.current;
    // Find all .dice-roll spans injected by makeDiceClickable
    const diceEls = el.querySelectorAll('.dice-roll');
    const handlers = [];

    diceEls.forEach(diceEl => {
      const notation = diceEl.dataset.dice;
      if (!notation) return;
      const handler = () => onRollDice(notation);
      diceEl.addEventListener('click', handler);
      handlers.push({ el: diceEl, handler });
    });

    return () => {
      handlers.forEach(({ el: diceEl, handler }) => {
        diceEl.removeEventListener('click', handler);
      });
    };
  }, [monster, onRollDice]);

  if (loading) {
    return (
      <div className="monster-detail">
        <button className="monster-detail__back" onClick={onBack} aria-label="Back to list">&larr; Back to list</button>
        <p style={{ textAlign: 'center', padding: '2rem' }}>Loading stat block...</p>
      </div>
    );
  }

  if (!monster) {
    return (
      <div className="monster-detail">
        <button className="monster-detail__back" onClick={onBack} aria-label="Back to list">&larr; Back to list</button>
        <p style={{ textAlign: 'center', padding: '2rem' }}>Monster not found.</p>
      </div>
    );
  }

  const markdown = monster.rawMarkdown || buildFallbackMarkdown(monster);
  const htmlWithDice = makeDiceClickable(marked.parse(markdown));
  const html = DOMPurify.sanitize(htmlWithDice, {
    ADD_ATTR: ['data-dice'],
    ADD_TAGS: ['span'],
  });

  return (
    <div className="monster-detail">
      <div className="monster-detail__header">
        <button className="monster-detail__back" onClick={onBack} aria-label="Back to list">&larr; Back</button>
        <div className="monster-detail__header-actions">
          {monster.isCustom && onEdit && (
            <button
              className="btn btn--sm btn--secondary"
              onClick={() => onEdit(monster)}
            >
              Edit
            </button>
          )}
          {monster.isCustom && onDelete && (
            <button
              className="btn btn--danger btn--sm"
              onClick={() => {
                if (window.confirm(`Delete "${monster.name}"? This cannot be undone.`)) {
                  onDelete(monster.slug);
                }
              }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
      <div
        ref={detailRef}
        className="stat-block-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

/**
 * Parse rendered HTML and wrap dice notation (e.g. "2d6 + 5", "1d20+4")
 * and standalone modifiers (e.g. "+10", "-1") in clickable <span> elements.
 */
function makeDiceClickable(html) {
  // Pass 1: Wrap full dice expressions (2d6, 1d20+5, 3d8-1)
  let result = html.replace(
    /(\d+d\d+(?:\s*[+-]\s*\d+)?)/g,
    '<span class="dice-roll" data-dice="$1" title="Click to roll $1">$1</span>'
  );

  // Pass 2: Wrap standalone modifiers (+10, -1) as d20 rolls.
  // Split HTML into tags and text segments. Only process text segments,
  // and skip text inside already-wrapped dice-roll spans.
  let insideDiceSpan = 0;
  result = result.replace(
    /(<span[^>]*class="[^"]*dice-roll[^"]*"[^>]*>)|(<\/span>)|(<[^>]*>)|([+-]\d+)/g,
    (match, diceOpen, spanClose, otherTag, mod) => {
      if (diceOpen) { insideDiceSpan++; return diceOpen; }
      if (spanClose) { if (insideDiceSpan > 0) insideDiceSpan--; return spanClose; }
      if (otherTag) return otherTag;
      // It's a modifier in text
      if (insideDiceSpan > 0) return match; // inside an existing dice-roll span, skip
      const diceExpr = `1d20${mod}`;
      return `<span class="dice-roll mod-roll" data-dice="${diceExpr}" title="Click to roll ${diceExpr}">${mod}</span>`;
    }
  );

  return result;
}

/**
 * Build a markdown stat block from structured monster data when rawMarkdown is missing.
 */
function buildFallbackMarkdown(m) {
  const mod = (score) => {
    const v = Math.floor((score - 10) / 2);
    return v >= 0 ? `+${v}` : `${v}`;
  };

  const lines = [];
  lines.push(`# ${m.name}`);
  lines.push(`*${m.size || 'Medium'} ${m.type || 'creature'}${m.alignment ? `, ${m.alignment}` : ''}*`);
  lines.push('---');
  lines.push(`**Armor Class** ${m.ac || 10}${m.acDesc ? ` (${m.acDesc})` : ''}`);
  lines.push(`**Hit Points** ${m.hp || 1}${m.hpFormula ? ` (${m.hpFormula})` : ''}`);
  lines.push(`**Speed** ${m.speed || '30 ft.'}`);
  lines.push('---');

  if (m.abilities) {
    const a = m.abilities;
    lines.push(`| STR | DEX | CON | INT | WIS | CHA |`);
    lines.push(`|:---:|:---:|:---:|:---:|:---:|:---:|`);
    lines.push(`| ${a.str} (${mod(a.str)}) | ${a.dex} (${mod(a.dex)}) | ${a.con} (${mod(a.con)}) | ${a.int} (${mod(a.int)}) | ${a.wis} (${mod(a.wis)}) | ${a.cha} (${mod(a.cha)}) |`);
    lines.push('---');
  }

  if (m.savingThrows) lines.push(`**Saving Throws** ${m.savingThrows}`);
  if (m.skills) lines.push(`**Skills** ${m.skills}`);
  if (m.damageResistances) lines.push(`**Damage Resistances** ${m.damageResistances}`);
  if (m.damageImmunities) lines.push(`**Damage Immunities** ${m.damageImmunities}`);
  if (m.damageVulnerabilities) lines.push(`**Damage Vulnerabilities** ${m.damageVulnerabilities}`);
  if (m.conditionImmunities) lines.push(`**Condition Immunities** ${m.conditionImmunities}`);
  if (m.senses) lines.push(`**Senses** ${m.senses}`);
  if (m.languages) lines.push(`**Languages** ${m.languages}`);
  if (m.cr) lines.push(`**Challenge** ${m.cr}`);

  if (m.traits?.length) {
    lines.push('---');
    for (const t of m.traits) {
      lines.push(`***${t.name}.*** ${t.description}`);
      lines.push('');
    }
  }

  if (m.actions?.length) {
    lines.push('## Actions');
    for (const a of m.actions) {
      lines.push(`***${a.name}.*** ${a.description}`);
      lines.push('');
    }
  }

  if (m.reactions?.length) {
    lines.push('## Reactions');
    for (const r of m.reactions) {
      lines.push(`***${r.name}.*** ${r.description}`);
      lines.push('');
    }
  }

  if (m.legendaryActions?.length) {
    lines.push('## Legendary Actions');
    for (const l of m.legendaryActions) {
      lines.push(`***${l.name}.*** ${l.description}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}
