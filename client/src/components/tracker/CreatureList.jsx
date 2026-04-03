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
