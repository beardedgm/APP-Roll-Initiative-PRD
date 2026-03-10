import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useMonsterBrowse, useMonster, useMonsterSources } from '../../api/useMonsters';
import useCombatStore from '../../store/useCombatStore';

const CR_OPTIONS = [
  '0', '1/8', '1/4', '1/2', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23',
  '24', '25', '26', '27', '28', '29', '30',
];

const SOURCE_BADGES = {
  '5.1_srd': '5.1',
  '5.2_srd': '5.2',
  a5e: 'A5E',
  black_flag: 'BF',
  cc: 'CC',
  tob1: 'ToB',
  tob2: 'ToB2',
  tob3: 'ToB3',
};

const PAGE_SIZE = 20;

const MonsterDatabase = forwardRef(function MonsterDatabase({ onRollDice, onAddToEncounter }, ref) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [crFilter, setCrFilter] = useState('');
  const [page, setPage] = useState(0);
  const [selectedSlug, setSelectedSlug] = useState(null);
  const timerRef = useRef(null);

  const addCombatant = useCombatStore(s => s.addCombatant);

  // Allow parent to open a stat block by slug
  useImperativeHandle(ref, () => ({
    showStatBlock(slug) { setSelectedSlug(slug); },
  }), []);
  const { data: sources = [] } = useMonsterSources();

  // Debounce
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(0);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [sourceFilter, crFilter]);

  const { data, isLoading } = useMonsterBrowse({
    q: debouncedQuery,
    source: sourceFilter,
    cr: crFilter,
    limit: PAGE_SIZE,
    skip: page * PAGE_SIZE,
  });

  const results = data?.results || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const { data: selectedMonster, isLoading: loadingDetail } = useMonster(selectedSlug);

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
        onAdd={handleAddToEncounter}
        onRollDice={onRollDice}
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
            onChange={e => setSourceFilter(e.target.value)}
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
            onChange={e => setCrFilter(e.target.value)}
          >
            <option value="">All CRs</option>
            {CR_OPTIONS.map(cr => (
              <option key={cr} value={cr}>CR {cr}</option>
            ))}
          </select>
        </div>
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
              <span className="monster-db__stat" title="Challenge Rating">
                CR {m.cr || '—'}
              </span>
              <span className="monster-db__stat" title="Hit Points">
                HP {m.hp}
              </span>
              <span className="monster-db__stat" title="Armor Class">
                AC {m.ac}
              </span>
              <span className="monster-search__source-badge">
                {SOURCE_BADGES[m.sourceKey] || m.sourceKey}
              </span>
            </div>
            <button
              className="monster-db__add-btn"
              title="Add to encounter"
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

function MonsterDetail({ monster, loading, onBack, onAdd, onRollDice }) {
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
        <button className="monster-detail__back" onClick={onBack}>&larr; Back to list</button>
        <p style={{ textAlign: 'center', padding: '2rem' }}>Loading stat block...</p>
      </div>
    );
  }

  if (!monster) {
    return (
      <div className="monster-detail">
        <button className="monster-detail__back" onClick={onBack}>&larr; Back to list</button>
        <p style={{ textAlign: 'center', padding: '2rem' }}>Monster not found.</p>
      </div>
    );
  }

  const html = makeDiceClickable(
    DOMPurify.sanitize(marked.parse(monster.rawMarkdown))
  );

  return (
    <div className="monster-detail">
      <div className="monster-detail__header">
        <button className="monster-detail__back" onClick={onBack}>&larr; Back</button>
        <button
          className="btn btn--primary btn--sm"
          onClick={() => onAdd(monster)}
        >
          + Add to Encounter
        </button>
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
 * in clickable <span class="dice-roll"> elements.
 */
function makeDiceClickable(html) {
  // Match patterns like: 2d6, 1d20 + 5, 3d8+2, 1d12 - 1
  // Captures the full dice expression
  return html.replace(
    /(\d+d\d+(?:\s*[+-]\s*\d+)?)/g,
    '<span class="dice-roll" data-dice="$1" title="Click to roll $1">$1</span>'
  );
}
