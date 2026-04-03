# Layout Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the tracker to separate navigation (left) from content display (right), setting the foundation for spells.

**Architecture:** Split MonsterDatabase into CreatureList (left panel) + ContentViewer (right panel). Add collapsible dice roller wrapper. Consolidate creature tabs with system toggle. Add right panel resize handle.

**Tech Stack:** React, Zustand, CSS custom properties, marked + DOMPurify, Lucide React

**Spec:** `docs/superpowers/specs/2026-04-03-layout-restructure-design.md`

---

## File Map

| File | Action | Description |
|---|---|---|
| `client/src/store/useUIStore.js` | Modify | Add content stack, system toggles, dice roller state |
| `client/src/components/tracker/SystemToggle.jsx` | Create | Reusable 5E/PF2E segmented control |
| `client/src/components/tracker/CreatureList.jsx` | Create | Search/filter/pagination list extracted from MonsterDatabase |
| `client/src/components/tracker/ContentViewer.jsx` | Create | Stat block renderer + breadcrumb nav (right panel) |
| `client/src/components/tracker/RightPanel.jsx` | Create | Container: collapsible dice roller + content viewer |
| `client/src/components/tracker/DiceRoller.jsx` | Modify | Add collapsible wrapper support |
| `client/src/components/tracker/LeftPanel.jsx` | Modify | New tab structure + system toggles |
| `client/src/pages/Tracker.jsx` | Modify | Wire up three-panel layout with right resize handle |
| `client/src/styles/tracker.css` | Modify | All new styles |
| `client/src/components/tracker/MonsterDatabase.jsx` | Remove (after migration) | Replaced by CreatureList + ContentViewer |

---

## Task 1: useUIStore -- Add content viewer state

**File:** `client/src/store/useUIStore.js`
**Branch-safe:** Yes -- pure additive, no existing behavior changes.

Replace the entire file with:

```js
import { create } from 'zustand';

const useUIStore = create((set, get) => ({
  // ── Existing modal state ──
  activeModal: null,
  statBlockSlug: null,
  editMonsterData: null,
  modalData: null,
  openModal: (id, data = null) => set({ activeModal: id, modalData: data }),
  closeModal: () => set({ activeModal: null, editMonsterData: null, modalData: null }),
  setStatBlockSlug: (slug) => set({ statBlockSlug: slug }),
  openEditMonster: (monster) => set({ activeModal: 'monster-form', editMonsterData: monster, modalData: null }),

  // ── Content viewer stack ──
  // Each entry: { type: 'creature' | 'spell', slug: string, name: string }
  contentStack: [],
  selectedCreatureSlug: null,

  pushContent: (entry) => {
    const { contentStack } = get();
    // If pushing same type as current top, replace (new selection from list).
    // If pushing different type (e.g. spell from stat block), push on top.
    if (contentStack.length > 0 && contentStack[contentStack.length - 1].type === entry.type) {
      set({ contentStack: [entry] });
    } else {
      set({ contentStack: [...contentStack, entry] });
    }
    if (entry.type === 'creature') {
      set({ selectedCreatureSlug: entry.slug });
    }
  },

  popContent: () => {
    const { contentStack } = get();
    if (contentStack.length <= 1) {
      set({ contentStack: [], selectedCreatureSlug: null });
      return;
    }
    const newStack = contentStack.slice(0, -1);
    const top = newStack[newStack.length - 1];
    set({
      contentStack: newStack,
      selectedCreatureSlug: top?.type === 'creature' ? top.slug : get().selectedCreatureSlug,
    });
  },

  clearContent: () => set({ contentStack: [], selectedCreatureSlug: null }),

  setSelectedCreature: (slug) => set({ selectedCreatureSlug: slug }),

  // ── Dice roller collapsed/expanded ──
  diceRollerExpanded: (() => {
    try {
      const saved = localStorage.getItem('dice-roller-expanded');
      return saved === 'true';
    } catch {
      return false;
    }
  })(),

  toggleDiceRoller: () => set((state) => {
    const next = !state.diceRollerExpanded;
    try { localStorage.setItem('dice-roller-expanded', String(next)); } catch { /* noop */ }
    return { diceRollerExpanded: next };
  }),

  // ── Per-tab game system toggles ──
  creaturesSystem: '5e',
  spellsSystem: '5e',

  setCreaturesSystem: (system) => set({ creaturesSystem: system }),
  setSpellsSystem: (system) => set({ spellsSystem: system }),
}));

export default useUIStore;
```

**Key decisions:**
- `pushContent` replaces the stack when selecting the same content type (creature replaces creature), but pushes when navigating across types (spell from stat block). This matches the spec: selecting a new creature resets the stack, clicking a spell in a stat block pushes.
- `diceRollerExpanded` initializes from localStorage at store creation time (IIFE in the initial state).
- `creaturesSystem` and `spellsSystem` are independent per the spec.

**Verify:** `cd client && npm run lint` -- no errors. Existing consumers of `openModal`, `closeModal`, `openEditMonster` are unaffected.

---

## Task 2: SystemToggle -- Reusable component

**File:** `client/src/components/tracker/SystemToggle.jsx` (new)
**Branch-safe:** Yes -- new file, no imports yet.

```jsx
/**
 * Segmented control for switching between 5E and PF2E game systems.
 * Used inside the Creatures and Spells tabs.
 *
 * Props:
 *   value    - '5e' | 'pf2e'
 *   onChange - (system: '5e' | 'pf2e') => void
 */
export default function SystemToggle({ value, onChange }) {
  return (
    <div className="system-toggle">
      <button
        className={`system-toggle__btn${value === '5e' ? ' system-toggle__btn--active' : ''}`}
        onClick={() => onChange('5e')}
        aria-pressed={value === '5e'}
      >
        5E
      </button>
      <button
        className={`system-toggle__btn${value === 'pf2e' ? ' system-toggle__btn--active' : ''}`}
        onClick={() => onChange('pf2e')}
        aria-pressed={value === 'pf2e'}
      >
        PF2E
      </button>
    </div>
  );
}
```

CSS is in Task 9.

---

## Task 3: CreatureList -- Extract from MonsterDatabase

**File:** `client/src/components/tracker/CreatureList.jsx` (new)
**Branch-safe:** Yes -- new file; old MonsterDatabase stays until Task 7 wires up LeftPanel.

This is lines 26-271 of MonsterDatabase with one key change: clicking a creature calls `pushContent` instead of `setSelectedSlug`. The detail view (MonsterDetail) does NOT live here -- it moves to ContentViewer in Task 4.

```jsx
import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMonsterBrowse, useMonsterSources } from '../../api/useMonsters';
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

const CreatureList = forwardRef(function CreatureList({ gameSystem = '5e', onAddToEncounter }, ref) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [crFilter, setCrFilter] = useState('');
  const [page, setPage] = useState(0);
  const timerRef = useRef(null);

  const addCombatant = useCombatStore(s => s.addCombatant);
  const openModal = useUIStore(s => s.openModal);
  const pushContent = useUIStore(s => s.pushContent);
  const selectedCreatureSlug = useUIStore(s => s.selectedCreatureSlug);
  const storeMonsters = useUserDataStore(s => s.customMonsters);

  const isPf2e = gameSystem === 'pf2e';
  const sourceBadges = isPf2e ? PF2E_SOURCE_BADGES : SOURCE_BADGES;
  const crLevelOptions = isPf2e ? LEVEL_OPTIONS_PF2E : CR_OPTIONS_5E;
  const crLabel = isPf2e ? 'Level' : 'CR';
  const crAllLabel = isPf2e ? 'All Levels' : 'All CRs';

  // Allow parent (LeftPanel) to select a creature by slug
  useImperativeHandle(ref, () => ({
    selectCreature(slug, name) {
      pushContent({ type: 'creature', slug, name: name || slug });
    },
  }), [pushContent]);

  const { data: sources = [] } = useMonsterSources(gameSystem);

  // Debounce search input
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

  // Filter custom monsters by search/CR/system
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

  const handleCreatureClick = useCallback((monster) => {
    pushContent({ type: 'creature', slug: monster.slug, name: monster.name });
  }, [pushContent]);

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
            {storeMonsters.filter(m => (m.gameSystem || '5e') === gameSystem).length > 0 && (
              <option value="custom">
                Custom ({storeMonsters.filter(m => (m.gameSystem || '5e') === gameSystem).length})
              </option>
            )}
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
          <Download size={14} /> Import JSON
        </button>
      </div>

      <div className="monster-db__count">
        {isLoading ? 'Searching...' : `${total.toLocaleString()} monsters found`}
      </div>

      <div className="monster-db__list">
        {results.map(m => (
          <div
            key={m.slug}
            className={`monster-db__item${m.slug === selectedCreatureSlug ? ' monster-db__item--selected' : ''}`}
            onClick={() => handleCreatureClick(m)}
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
                {isPf2e ? `Lvl ${m.cr || '\u2014'}` : `CR ${m.cr || '\u2014'}`}
              </span>
              <span className="monster-db__stat" title="Hit Points">
                HP {m.hp}
              </span>
              <span className="monster-db__stat" title="Armor Class">
                AC {m.ac}
              </span>
              <span className="monster-search__source-badge">
                {m.isCustom ? 'Custom' : (sourceBadges[m.sourceKey] || m.sourceKey)}
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
            <ChevronLeft size={14} /> Prev
          </button>
          <span className="monster-db__page-info">
            Page {page + 1} of {totalPages}
          </span>
          <button
            className="btn btn--sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
});

export default CreatureList;
```

**Key changes from MonsterDatabase:**
- No `selectedSlug` local state. Selection lives in `useUIStore.selectedCreatureSlug`.
- No `MonsterDetail` rendering. The detail view is now in ContentViewer.
- `useImperativeHandle` exposes `selectCreature(slug, name)` instead of `showStatBlock(slug)`.
- Clicking a list item calls `pushContent({ type: 'creature', slug, name })`.
- Selected item gets `monster-db__item--selected` class for highlighting.
- `onRollDice` prop is removed -- dice rolling happens in ContentViewer, not the list.

---

## Task 4: ContentViewer -- New component

**File:** `client/src/components/tracker/ContentViewer.jsx` (new)
**Branch-safe:** Yes -- new file.

This component takes the MonsterDetail rendering (lines 277-356), `makeDiceClickable` (lines 362-387), and `buildFallbackMarkdown` (lines 392-458) from MonsterDatabase.

```jsx
import { useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useMonster } from '../../api/useMonsters';
import useUIStore from '../../store/useUIStore';
import useUserDataStore from '../../store/useUserDataStore';

/**
 * ContentViewer -- renders stat blocks (and future spell descriptions) in the right panel.
 * Reads from useUIStore.contentStack. Top of stack = what is displayed.
 *
 * Props:
 *   onRollDice    - (notation: string) => void -- called when dice notation is clicked
 *   onSpellClick  - (spellName: string) => void -- foundation for sub-project 3, not wired yet
 */
export default function ContentViewer({ onRollDice, onSpellClick }) {
  const contentStack = useUIStore(s => s.contentStack);
  const popContent = useUIStore(s => s.popContent);
  const openEditMonster = useUIStore(s => s.openEditMonster);

  const storeMonsters = useUserDataStore(s => s.customMonsters);
  const removeCustomMonster = useUserDataStore(s => s.removeCustomMonster);

  const current = contentStack.length > 0 ? contentStack[contentStack.length - 1] : null;
  const previous = contentStack.length > 1 ? contentStack[contentStack.length - 2] : null;

  if (!current) {
    return (
      <div className="content-viewer content-viewer--empty">
        <BookOpen size={32} className="content-viewer__empty-icon" />
        <p className="content-viewer__empty-text">Select a creature or spell to view details</p>
      </div>
    );
  }

  if (current.type === 'creature') {
    return (
      <CreatureStatBlock
        slug={current.slug}
        breadcrumb={previous ? `\u2190 Back to ${previous.name}` : null}
        onBack={previous ? popContent : null}
        onRollDice={onRollDice}
      />
    );
  }

  // Future: spell rendering
  return (
    <div className="content-viewer content-viewer--empty">
      <p className="content-viewer__empty-text">Content type not yet supported.</p>
    </div>
  );
}

/* ---- Creature Stat Block Sub-component ---- */

function CreatureStatBlock({ slug, breadcrumb, onBack, onRollDice }) {
  const detailRef = useRef(null);
  const openEditMonster = useUIStore(s => s.openEditMonster);
  const storeMonsters = useUserDataStore(s => s.customMonsters);
  const removeCustomMonster = useUserDataStore(s => s.removeCustomMonster);
  const clearContent = useUIStore(s => s.clearContent);

  const isCustomSlug = storeMonsters.some(m => m.slug === slug);
  const { data: apiMonster, isLoading } = useMonster(isCustomSlug ? null : slug);
  const storeDetailMonster = isCustomSlug ? storeMonsters.find(m => m.slug === slug) : null;
  const monster = isCustomSlug ? storeDetailMonster : apiMonster;
  const loading = isCustomSlug ? false : isLoading;

  // Event delegation for dice clicks in the rendered HTML
  useEffect(() => {
    if (!detailRef.current || !onRollDice) return;

    const el = detailRef.current;
    const handler = (e) => {
      const diceEl = e.target.closest('.dice-roll');
      if (!diceEl || !el.contains(diceEl)) return;
      const notation = diceEl.dataset.dice;
      if (notation) onRollDice(notation);
    };

    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [onRollDice]);

  const handleDelete = useCallback((deleteSlug) => {
    try {
      removeCustomMonster(deleteSlug);
      clearContent();
    } catch {
      window.alert('Failed to delete monster.');
    }
  }, [removeCustomMonster, clearContent]);

  if (loading) {
    return (
      <div className="content-viewer">
        {breadcrumb && (
          <button className="content-viewer__breadcrumb" onClick={onBack}>{breadcrumb}</button>
        )}
        <p className="content-viewer__loading">Loading stat block...</p>
      </div>
    );
  }

  if (!monster) {
    return (
      <div className="content-viewer">
        {breadcrumb && (
          <button className="content-viewer__breadcrumb" onClick={onBack}>{breadcrumb}</button>
        )}
        <p className="content-viewer__loading">Monster not found.</p>
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
    <div className="content-viewer">
      <div className="content-viewer__header">
        {breadcrumb && (
          <button className="content-viewer__breadcrumb" onClick={onBack}>{breadcrumb}</button>
        )}
        <div className="content-viewer__header-actions">
          {monster.isCustom && (
            <button
              className="btn btn--sm btn--secondary"
              onClick={() => openEditMonster(monster)}
            >
              Edit
            </button>
          )}
          {monster.isCustom && (
            <button
              className="btn btn--danger btn--sm"
              onClick={() => {
                if (window.confirm(`Delete "${monster.name}"? This cannot be undone.`)) {
                  handleDelete(monster.slug);
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

/* ---- Utility: makeDiceClickable ---- */

/**
 * Parse rendered HTML and wrap dice notation (e.g. "2d6 + 5", "1d20+4")
 * and standalone modifiers (e.g. "+10", "-1") in clickable <span> elements.
 *
 * Moved from MonsterDatabase.jsx (lines 362-387).
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

/* ---- Utility: buildFallbackMarkdown ---- */

/**
 * Build a markdown stat block from structured monster data when rawMarkdown is missing.
 *
 * Moved from MonsterDatabase.jsx (lines 392-458).
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
```

**Key decisions:**
- `makeDiceClickable` and `buildFallbackMarkdown` are private to this file (not shared util) since only ContentViewer uses them. If a future spell viewer needs `makeDiceClickable`, it can be extracted then.
- `CreatureStatBlock` is an internal sub-component, not exported.
- `onSpellClick` prop is accepted but not yet wired -- foundation for sub-project 3.
- Custom monster Edit/Delete actions work from here since `useUserDataStore` and `useUIStore.openEditMonster` are accessible.
- On delete, `clearContent()` is called instead of `setSelectedSlug(null)`.

---

## Task 5: RightPanel -- Container component

**File:** `client/src/components/tracker/RightPanel.jsx` (new)
**Branch-safe:** Yes -- new file.

```jsx
import { ChevronDown, ChevronUp, Dices } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useCombatStore from '../../store/useCombatStore';
import DiceRoller from './DiceRoller';
import ContentViewer from './ContentViewer';

/**
 * Right panel container: collapsible dice roller on top, content viewer below.
 *
 * Props:
 *   onRollDice   - (notation: string) => void
 *   onSpellClick - (spellName: string) => void (future)
 */
export default function RightPanel({ onRollDice, onSpellClick }) {
  const diceRollerExpanded = useUIStore(s => s.diceRollerExpanded);
  const toggleDiceRoller = useUIStore(s => s.toggleDiceRoller);
  const diceHistory = useCombatStore(s => s.diceHistory);

  const lastRoll = diceHistory.length > 0 ? diceHistory[0] : null;
  const lastRollSummary = lastRoll
    ? `${lastRoll.count}d${lastRoll.sides}${lastRoll.modifier >= 0 ? '+' : ''}${lastRoll.modifier} = ${lastRoll.total}`
    : null;

  return (
    <div className="right-panel">
      <div className="right-panel__dice-section">
        {diceRollerExpanded ? (
          <div className="right-panel__dice-expanded">
            <button
              className="right-panel__dice-collapse-btn"
              onClick={toggleDiceRoller}
              aria-label="Collapse dice roller"
            >
              <ChevronUp size={14} />
            </button>
            <DiceRoller />
          </div>
        ) : (
          <button
            className="right-panel__dice-collapsed"
            onClick={toggleDiceRoller}
            aria-label="Expand dice roller"
          >
            <span className="right-panel__dice-collapsed-left">
              <Dices size={16} /> Dice Roller
            </span>
            {lastRollSummary && (
              <span className="right-panel__dice-collapsed-last">
                Last: {lastRollSummary}
              </span>
            )}
            <ChevronDown size={14} />
          </button>
        )}
      </div>

      <div className="right-panel__content">
        <ContentViewer onRollDice={onRollDice} onSpellClick={onSpellClick} />
      </div>
    </div>
  );
}
```

**Key decisions:**
- The collapsed bar is a single `<button>` so the entire row is clickable.
- When expanded, a small collapse button sits above the existing DiceRoller component (no changes needed to DiceRoller internals for this to work).
- `lastRollSummary` reads from `diceHistory[0]` (most recent entry at index 0) to show in the collapsed bar.

---

## Task 6: DiceRoller -- Add collapsible wrapper

**File:** `client/src/components/tracker/DiceRoller.jsx`
**Branch-safe:** Yes -- non-breaking. The DiceRoller is now rendered inside RightPanel.

**Changes required:** Minimal. The existing DiceRoller is used as-is inside RightPanel. The collapsible wrapper is handled entirely by RightPanel (Task 5). The only change: remove the outer `<h2>` title row since RightPanel's collapsed bar serves that purpose when collapsed, and we add a slimmer title when expanded.

Replace the title row (lines 88-101):

**Old (lines 88-101):**
```jsx
      <div className="panel__title-row">
        <h2 className="panel__title"><Dices size={18} /> Dice Roller</h2>
        <label className="show-rolls-toggle" title="Broadcast dice rolls to the player view">
          <span className="show-rolls-toggle__label">Show Rolls</span>
          <button
            type="button"
            role="switch"
            aria-checked={showRollsToPlayers}
            className={`show-rolls-toggle__switch${showRollsToPlayers ? ' show-rolls-toggle__switch--on' : ''}`}
            onClick={toggleShowRolls}
          >
            <span className="show-rolls-toggle__knob" />
          </button>
        </label>
      </div>
```

**New:**
```jsx
      <div className="panel__title-row">
        <label className="show-rolls-toggle" title="Broadcast dice rolls to the player view">
          <span className="show-rolls-toggle__label">Show Rolls</span>
          <button
            type="button"
            role="switch"
            aria-checked={showRollsToPlayers}
            className={`show-rolls-toggle__switch${showRollsToPlayers ? ' show-rolls-toggle__switch--on' : ''}`}
            onClick={toggleShowRolls}
          >
            <span className="show-rolls-toggle__knob" />
          </button>
        </label>
      </div>
```

The only change is removing `<h2 className="panel__title"><Dices size={18} /> Dice Roller</h2>` from the title row. The "Dice Roller" label is now in RightPanel's collapsed/expanded header. The "Show Rolls" toggle stays in the DiceRoller panel.

Also remove the `Dices` import from the import line if no longer used:

**Old:** `import { Dices, X, RotateCcw } from 'lucide-react';`
**New:** `import { X, RotateCcw } from 'lucide-react';`

---

## Task 7: LeftPanel -- Restructure tabs + system toggle

**File:** `client/src/components/tracker/LeftPanel.jsx`
**Branch-safe:** Depends on Tasks 2, 3 being done first.

Replace the entire file:

```jsx
import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import useUIStore from '../../store/useUIStore';
import SystemToggle from './SystemToggle';
import CreatureList from './CreatureList';
import CharacterLibrary from './CharacterLibrary';
import EncounterLibrary from './EncounterLibrary';

const TABS = [
  { id: 'creatures', label: 'Creatures' },
  { id: 'spells', label: 'Spells' },
  { id: 'characters', label: 'Characters' },
  { id: 'encounters', label: 'Encounters' },
];

const LeftPanel = forwardRef(function LeftPanel({ onAddToEncounter }, ref) {
  const [activeTab, setActiveTab] = useState('creatures');
  const creatureListRef = useRef(null);

  const creaturesSystem = useUIStore(s => s.creaturesSystem);
  const setCreaturesSystem = useUIStore(s => s.setCreaturesSystem);
  const spellsSystem = useUIStore(s => s.spellsSystem);
  const setSpellsSystem = useUIStore(s => s.setSpellsSystem);
  const pushContent = useUIStore(s => s.pushContent);

  useImperativeHandle(ref, () => ({
    showStatBlock(slug) {
      // Switch to creatures tab and set system based on slug prefix
      setActiveTab('creatures');
      if (slug.startsWith('pf2e_')) {
        setCreaturesSystem('pf2e');
      } else {
        setCreaturesSystem('5e');
      }
      // Push to content viewer (right panel) and select in list
      // We use a short delay to let the system toggle + tab switch render
      // so the CreatureList ref is available with the correct gameSystem
      setTimeout(() => {
        creatureListRef.current?.selectCreature(slug);
      }, 0);
      pushContent({ type: 'creature', slug, name: slug });
    },
  }), [setCreaturesSystem, pushContent]);

  return (
    <div className="left-panel">
      <div className="left-panel__tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`left-panel__tab${activeTab === tab.id ? ' left-panel__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="left-panel__content">
        {activeTab === 'creatures' && (
          <>
            <SystemToggle value={creaturesSystem} onChange={setCreaturesSystem} />
            <CreatureList
              ref={creatureListRef}
              gameSystem={creaturesSystem}
              onAddToEncounter={onAddToEncounter}
            />
          </>
        )}
        {activeTab === 'spells' && (
          <>
            <SystemToggle value={spellsSystem} onChange={setSpellsSystem} />
            <div className="left-panel__placeholder">
              <p>Spells coming soon</p>
            </div>
          </>
        )}
        {activeTab === 'characters' && <CharacterLibrary />}
        {activeTab === 'encounters' && <EncounterLibrary />}
      </div>
    </div>
  );
});

export default LeftPanel;
```

**Key changes:**
- Tabs: `5E | PF2E | Characters | Encounters` becomes `Creatures | Spells | Characters | Encounters`.
- Creatures tab: `SystemToggle` + `CreatureList` (one component, system from toggle).
- Spells tab: `SystemToggle` + placeholder.
- `onRollDice` prop removed from LeftPanel -- dice rolling moved to ContentViewer in the right panel.
- `showStatBlock` sets the tab, system toggle, pushes to content stack, AND calls `creatureListRef.selectCreature`.
- Only one `creatureListRef` needed (not two like the old `monsterDbRef5e`/`monsterDbRefPf2e`) because `CreatureList` re-renders with the new `gameSystem` when the toggle changes.

---

## Task 8: Tracker.jsx -- Wire up three-panel layout

**File:** `client/src/pages/Tracker.jsx`
**Branch-safe:** Depends on Tasks 5, 7 being done first.

Replace the entire file:

```jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import useCombatStore from '../store/useCombatStore';

import { useCurrentUser } from '../api/useAuth';
import useUserDataStore from '../store/useUserDataStore';
import useUserDataInit from '../hooks/useUserDataInit';
import useEncounterCloudSetup from '../hooks/useEncounterCloudSetup';
import TrackerHeader from '../components/tracker/TrackerHeader';
import TurnControls from '../components/tracker/TurnControls';
import InitiativeList from '../components/tracker/InitiativeList';
import LeftPanel from '../components/tracker/LeftPanel';
import RightPanel from '../components/tracker/RightPanel';
import StartCombatModal from '../components/tracker/StartCombatModal';
import StatBlockModal from '../components/tracker/StatBlockModal';
import DiceToast from '../components/tracker/DiceToast';
import ImportMonsterModal from '../components/monsters/ImportMonsterModal';
import MonsterFormModal from '../components/monsters/MonsterFormModal';
import { migrateLocalStorageToStore } from '../utils/migrateLocalStorage';
import '../styles/tracker.css';

const DEFAULT_LEFT_WIDTH = 320;
const MIN_LEFT_WIDTH = 260;
const DEFAULT_RIGHT_WIDTH = 340;
const MIN_RIGHT_WIDTH = 280;

export default function Tracker() {
  const leftPanelRef = useRef(null);

  // ── Left panel resize ──
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = localStorage.getItem('tracker-left-width');
    return saved ? Math.max(MIN_LEFT_WIDTH, parseInt(saved)) : DEFAULT_LEFT_WIDTH;
  });
  const isResizingLeft = useRef(false);

  // ── Right panel resize ──
  const [rightWidth, setRightWidth] = useState(() => {
    const saved = localStorage.getItem('tracker-right-width');
    return saved ? Math.max(MIN_RIGHT_WIDTH, parseInt(saved)) : DEFAULT_RIGHT_WIDTH;
  });
  const isResizingRight = useRef(false);

  const undo = useCombatStore(s => s.undo);
  const redo = useCombatStore(s => s.redo);
  const addCombatant = useCombatStore(s => s.addCombatant);
  const rollDice = useCombatStore(s => s.rollDice);
  const combatState = useCombatStore(s => s.state);
  const nextTurn = useCombatStore(s => s.nextTurn);

  const { data: user } = useCurrentUser();
  const isAuthenticated = !!user;
  const dataLoaded = useUserDataStore(s => s._loaded);

  // Initialize user data from server + enable auto-sync
  useUserDataInit(isAuthenticated);

  // One-time migration from old localStorage keys
  useEffect(() => {
    if (dataLoaded) {
      migrateLocalStorageToStore();
    }
  }, [dataLoaded]);

  // Wire up live encounter cloud sync for subscribers
  useEncounterCloudSetup(user);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      // Spacebar -> Next Turn (only during combat, only when no input is focused)
      if (e.key === ' ' && combatState === 'combat') {
        const tag = document.activeElement?.tagName?.toLowerCase();
        const isEditable = tag === 'input' || tag === 'textarea' || tag === 'select' || document.activeElement?.isContentEditable;
        if (!isEditable) {
          e.preventDefault();
          nextTurn();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, combatState, nextTurn]);

  const handleAddMonster = useCallback((monsterData) => {
    addCombatant({
      name: monsterData.name,
      maxHP: monsterData.hp || monsterData.maxHP,
      ac: monsterData.ac,
      initMod: monsterData.initiativeModifier ?? monsterData.initMod ?? 0,
      type: 'monster',
      quantity: 1,
      monsterSlug: monsterData.slug || monsterData.monsterSlug,
    });
  }, [addCombatant]);

  /** Roll dice from stat block notation like "2d6 + 5" */
  const handleStatBlockRoll = useCallback((notation) => {
    const m = notation.replace(/\s/g, '').match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (!m) return;
    const count = parseInt(m[1]);
    const sides = parseInt(m[2]);
    const modifier = m[3] ? parseInt(m[3]) : 0;
    rollDice({ sides, count, modifier, advantage: 'normal' });
  }, [rollDice]);

  /** Show stat block in the left panel + right panel content viewer */
  const handleViewStatBlock = useCallback((slug) => {
    leftPanelRef.current?.showStatBlock(slug);
  }, []);

  /** Left panel resize handle drag logic */
  const handleLeftResizeStart = useCallback((e) => {
    e.preventDefault();
    isResizingLeft.current = true;
    document.body.classList.add('is-resizing');

    const onMouseMove = (moveEvent) => {
      if (!isResizingLeft.current) return;
      const maxWidth = Math.floor(window.innerWidth * 0.4);
      const newWidth = Math.min(maxWidth, Math.max(MIN_LEFT_WIDTH, moveEvent.clientX - 16));
      setLeftWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizingLeft.current = false;
      document.body.classList.remove('is-resizing');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setLeftWidth(w => { localStorage.setItem('tracker-left-width', String(w)); return w; });
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  /** Right panel resize handle drag logic */
  const handleRightResizeStart = useCallback((e) => {
    e.preventDefault();
    isResizingRight.current = true;
    document.body.classList.add('is-resizing');

    const onMouseMove = (moveEvent) => {
      if (!isResizingRight.current) return;
      const maxWidth = Math.floor(window.innerWidth * 0.4);
      const newWidth = Math.min(maxWidth, Math.max(MIN_RIGHT_WIDTH, window.innerWidth - moveEvent.clientX - 16));
      setRightWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizingRight.current = false;
      document.body.classList.remove('is-resizing');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setRightWidth(w => { localStorage.setItem('tracker-right-width', String(w)); return w; });
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  return (
    <>
      <TrackerHeader />
      <main
        className="dm-main dm-main--3col"
        style={{ gridTemplateColumns: `${leftWidth}px 6px 1fr 6px ${rightWidth}px` }}
      >
        <section className="dm-col dm-col--left">
          <LeftPanel
            ref={leftPanelRef}
            onAddToEncounter={handleAddMonster}
          />
        </section>

        <div
          className="resize-handle resize-handle--left"
          onMouseDown={handleLeftResizeStart}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize left panel"
        />

        <section className="dm-col dm-col--center">
          <TurnControls />
          <InitiativeList onViewStatBlock={handleViewStatBlock} />
        </section>

        <div
          className="resize-handle resize-handle--right"
          onMouseDown={handleRightResizeStart}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize right panel"
        />

        <section className="dm-col dm-col--right">
          <RightPanel
            onRollDice={handleStatBlockRoll}
          />
        </section>
      </main>
      <StartCombatModal />
      <StatBlockModal
        onAddToEncounter={handleAddMonster}
        onRollDice={handleStatBlockRoll}
      />
      <ImportMonsterModal />
      <MonsterFormModal />
      <DiceToast />
    </>
  );
}
```

**Key changes:**
- Grid: `${leftWidth}px 6px 1fr 6px ${rightWidth}px` -- adds right resize handle column and right panel width.
- `DiceRoller` import removed -- it's now inside `RightPanel`.
- `LeftPanel` no longer receives `onRollDice` -- dice rolling is handled in ContentViewer via RightPanel.
- Right panel resize logic mirrors left panel resize logic but calculates width from the right edge: `window.innerWidth - moveEvent.clientX - 16`.
- Max width for both panels reduced to 40% (from 50%) to ensure center panel has space.
- `DEFAULT_RIGHT_WIDTH = 340`, `MIN_RIGHT_WIDTH = 280` per spec.

---

## Task 9: CSS -- All new styles

**File:** `client/src/styles/tracker.css`
**Branch-safe:** Yes -- additive CSS. Existing classes are modified only where noted.

### 9a: Update grid template default

Find and replace the `.dm-main--3col` default:

**Old (line 99-102):**
```css
.dm-main--3col {
  grid-template-columns: 320px 6px 1fr 300px;
  gap: var(--space-sm);
}
```

**New:**
```css
.dm-main--3col {
  grid-template-columns: 320px 6px 1fr 6px 340px;
  gap: var(--space-sm);
}
```

### 9b: Add selected item style for creature list

Add after the existing `.monster-db__item:hover` rule (around line 1470):

```css
.monster-db__item--selected {
  background: rgba(201, 162, 103, 0.1);
  border-left: 2px solid var(--color-accent-gold);
}
```

### 9c: SystemToggle styles

Add in a new section after the left panel styles (after line 2011):

```css
/* ── System Toggle (5E / PF2E segmented control) ──────────── */
.system-toggle {
  display: flex;
  gap: 0;
  margin: 0 var(--space-sm) var(--space-sm);
  background: var(--color-bg-dark);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  overflow: hidden;
  flex-shrink: 0;
}

.system-toggle__btn {
  flex: 1;
  padding: 0.35rem 0.75rem;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-family: var(--font-app);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  transition: color var(--transition-fast), background var(--transition-fast);
}

.system-toggle__btn:hover {
  color: var(--color-text-primary);
  background: rgba(201, 162, 103, 0.06);
}

.system-toggle__btn--active {
  color: var(--color-bg-dark);
  background: var(--color-accent-gold);
}
```

### 9d: Right panel styles

Add after the system toggle styles:

```css
/* ── Right Panel ──────────────────────────────────────────── */
.right-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.right-panel__dice-section {
  flex-shrink: 0;
  border-bottom: 1px solid var(--color-border);
}

.right-panel__dice-collapsed {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg-mid);
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-family: var(--font-app);
  font-size: 0.8rem;
  transition: background var(--transition-fast);
}

.right-panel__dice-collapsed:hover {
  background: var(--color-bg-card-hover);
}

.right-panel__dice-collapsed-left {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.75rem;
  color: var(--color-accent-gold);
}

.right-panel__dice-collapsed-last {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  flex: 1;
  text-align: right;
  margin-right: 0.5rem;
}

.right-panel__dice-expanded {
  position: relative;
}

.right-panel__dice-collapse-btn {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0.15rem 0.3rem;
  z-index: 2;
  transition: color var(--transition-fast), border-color var(--transition-fast);
}

.right-panel__dice-collapse-btn:hover {
  color: var(--color-accent-gold);
  border-color: var(--color-accent-gold-dim);
}

.right-panel__content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
```

### 9e: ContentViewer styles

Add after the right panel styles:

```css
/* ── Content Viewer ───────────────────────────────────────── */
.content-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--space-sm);
}

.content-viewer--empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 2rem;
}

.content-viewer__empty-icon {
  color: var(--color-text-tertiary);
  margin-bottom: 0.75rem;
  opacity: 0.5;
}

.content-viewer__empty-text {
  color: var(--color-text-tertiary);
  font-size: 0.85rem;
}

.content-viewer__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm);
  gap: var(--space-sm);
  flex-shrink: 0;
}

.content-viewer__header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.content-viewer__breadcrumb {
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-xs) var(--space-sm);
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-family: var(--font-app);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: color var(--transition-fast), background var(--transition-fast), border-color var(--transition-fast);
}

.content-viewer__breadcrumb:hover {
  background: var(--color-bg-card-hover);
  color: var(--color-accent-gold);
  border-color: var(--color-accent-gold-dim);
}

.content-viewer__loading {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-muted);
}
```

### 9f: Left panel placeholder (Spells coming soon)

```css
/* ── Left Panel Placeholder ───────────────────────────────── */
.left-panel__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--color-text-tertiary);
  font-size: 0.9rem;
  text-align: center;
}
```

### 9g: Update responsive breakpoints

Replace the responsive section (lines 1068-1091):

**Old:**
```css
@media (max-width: 1100px) {
  .dm-main--3col {
    grid-template-columns: 1fr 1fr !important;
  }
  .dm-col--left {
    grid-column: 1 / -1;
    max-height: 300px;
  }
  .resize-handle { display: none; }
}
@media (max-width: 820px) {
  .dm-main,
  .dm-main--3col {
    grid-template-columns: 1fr !important;
    height: auto;
    overflow: visible;
  }
  .dm-col { overflow: visible; }
  .dm-col--left { max-height: none; }
  .resize-handle { display: none; }
  .dm-header { flex-wrap: wrap; }
  .dm-header__center { order: 3; width: 100%; text-align: left; }
}
```

**New:**
```css
@media (max-width: 1100px) {
  .dm-main--3col {
    grid-template-columns: 1fr 1fr !important;
  }
  .dm-col--left {
    grid-column: 1 / -1;
    max-height: 300px;
  }
  .dm-col--right {
    grid-column: 1 / -1;
    max-height: 400px;
  }
  .resize-handle { display: none; }
}
@media (max-width: 820px) {
  .dm-main,
  .dm-main--3col {
    grid-template-columns: 1fr !important;
    height: auto;
    overflow: visible;
  }
  .dm-col { overflow: visible; }
  .dm-col--left { max-height: none; }
  .dm-col--right { max-height: none; }
  .resize-handle { display: none; }
  .dm-header { flex-wrap: wrap; }
  .dm-header__center { order: 3; width: 100%; text-align: left; }
}
```

---

## Task 10: Lint and verification

Run these commands and fix any issues:

```bash
cd client && npm run lint
cd client && npx vite build
cd server && npx eslint .
```

**Expected issues to check for:**
- `MonsterDatabase.jsx` is now unused -- can be deleted or left with a deprecation comment. Confirm no other imports reference it (search for `MonsterDatabase` in the codebase). The only import was in `LeftPanel.jsx` which now imports `CreatureList`.
- `StatBlockModal` still exists and references its own markdown rendering. It's a separate modal (not the left-panel detail view), so it should be unaffected. Verify it still works.
- `DiceRoller` import removed from `Tracker.jsx` -- verify no other file imports `DiceRoller` directly (only `RightPanel` should now).
- `handleStatBlockRoll` is still needed in Tracker.jsx -- it's passed to `RightPanel.onRollDice` and `StatBlockModal.onRollDice`.

**After all tasks pass lint and build:**
1. Delete `client/src/components/tracker/MonsterDatabase.jsx` (all its logic lives in CreatureList + ContentViewer now).
2. Manual test: click a creature in left panel, verify stat block appears in right panel.
3. Manual test: click a combatant name in the tracker, verify stat block appears in right panel.
4. Manual test: collapse/expand dice roller, verify state persists across page reload.
5. Manual test: resize both panels, verify widths persist to localStorage.
6. Manual test: switch between 5E and PF2E in the system toggle, verify correct data loads.
7. Manual test: create/edit/delete a custom monster from the content viewer, verify actions work.

---

## Dependency Graph

```
Task 1 (useUIStore)
  |
  +-- Task 2 (SystemToggle)  [no deps]
  |
  +-- Task 3 (CreatureList)   [depends on Task 1]
  |
  +-- Task 4 (ContentViewer)  [depends on Task 1]
  |
  +-- Task 5 (RightPanel)     [depends on Task 4, Task 6]
  |
  +-- Task 6 (DiceRoller mod) [no deps]
  |
  +-- Task 7 (LeftPanel)      [depends on Tasks 1, 2, 3]
  |
  +-- Task 8 (Tracker.jsx)    [depends on Tasks 5, 7]
  |
  +-- Task 9 (CSS)            [depends on Tasks 2-8]
  |
  +-- Task 10 (Lint/verify)   [depends on all above]
```

**Parallelizable groups:**
- Group A (no deps): Tasks 1, 2, 6
- Group B (after Task 1): Tasks 3, 4
- Group C (after Group B): Tasks 5, 7
- Group D (after Group C): Task 8
- Group E (after all): Tasks 9, 10

In practice, the CSS (Task 9) can be built incrementally alongside each component task. The plan separates it for clarity but implementers can add styles with each component.
