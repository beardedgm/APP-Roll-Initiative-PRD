import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSpellBrowse, useSpellSources } from '../../api/useSpells';
import useUIStore from '../../store/useUIStore';

const LEVEL_OPTIONS_5E = [
  { value: '0', label: 'Cantrip' },
  { value: '1', label: '1st Level' },
  { value: '2', label: '2nd Level' },
  { value: '3', label: '3rd Level' },
  { value: '4', label: '4th Level' },
  { value: '5', label: '5th Level' },
  { value: '6', label: '6th Level' },
  { value: '7', label: '7th Level' },
  { value: '8', label: '8th Level' },
  { value: '9', label: '9th Level' },
];

const RANK_OPTIONS_PF2E = [
  { value: '0', label: 'Cantrip' },
  { value: '1', label: 'Rank 1' },
  { value: '2', label: 'Rank 2' },
  { value: '3', label: 'Rank 3' },
  { value: '4', label: 'Rank 4' },
  { value: '5', label: 'Rank 5' },
  { value: '6', label: 'Rank 6' },
  { value: '7', label: 'Rank 7' },
  { value: '8', label: 'Rank 8' },
  { value: '9', label: 'Rank 9' },
  { value: '10', label: 'Rank 10' },
];

const SCHOOLS_5E = [
  'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
  'Evocation', 'Illusion', 'Necromancy', 'Transmutation',
];

const TRADITIONS_PF2E = [
  'arcane', 'divine', 'occult', 'primal',
];

const PAGE_SIZE = 12;

export default function SpellList({ gameSystem = '5e' }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [thirdFilter, setThirdFilter] = useState(''); // school (5e) or tradition (pf2e)
  const [page, setPage] = useState(0);
  const timerRef = useRef(null);

  const isPf2e = gameSystem === 'pf2e';
  const levelOptions = isPf2e ? RANK_OPTIONS_PF2E : LEVEL_OPTIONS_5E;
  const levelAllLabel = isPf2e ? 'All Ranks' : 'All Levels';

  const pushContent = useUIStore(s => s.pushContent);
  const contentStack = useUIStore(s => s.contentStack);
  const selectedSpellSlug = contentStack.length > 0 && contentStack[contentStack.length - 1].type === 'spell'
    ? contentStack[contentStack.length - 1].slug
    : null;

  const { data: sources = [] } = useSpellSources(gameSystem);

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
  function handleLevelFilter(val) { setLevelFilter(val); setPage(0); }
  function handleThirdFilter(val) { setThirdFilter(val); setPage(0); }

  const { data, isLoading } = useSpellBrowse({
    q: debouncedQuery,
    source: sourceFilter,
    level: levelFilter,
    school: isPf2e ? '' : thirdFilter,
    tradition: isPf2e ? thirdFilter : '',
    gameSystem,
    limit: PAGE_SIZE,
    skip: page * PAGE_SIZE,
  });

  const results = data?.results || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSpellClick = useCallback((spell) => {
    pushContent({ type: 'spell', slug: spell.slug, name: spell.name });
  }, [pushContent]);

  return (
    <div className="spell-list">
      <div className="spell-list__filters">
        <input
          type="text"
          className="spell-list__search"
          placeholder="Search spells..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <div className="spell-list__filter-row">
          <select
            className="spell-list__select"
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
            className="spell-list__select"
            value={levelFilter}
            onChange={e => handleLevelFilter(e.target.value)}
          >
            <option value="">{levelAllLabel}</option>
            {levelOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="spell-list__filter-row">
          {isPf2e ? (
            <select
              className="spell-list__select spell-list__select--full"
              value={thirdFilter}
              onChange={e => handleThirdFilter(e.target.value)}
            >
              <option value="">All Traditions</option>
              {TRADITIONS_PF2E.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          ) : (
            <select
              className="spell-list__select spell-list__select--full"
              value={thirdFilter}
              onChange={e => handleThirdFilter(e.target.value)}
            >
              <option value="">All Schools</option>
              {SCHOOLS_5E.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="spell-list__count">
        {isLoading ? 'Searching...' : `${total.toLocaleString()} spells found`}
      </div>

      <div className="spell-list__items">
        {results.map(spell => (
          <div
            key={spell.slug}
            className={`spell-list__item${spell.slug === selectedSpellSlug ? ' spell-list__item--selected' : ''}`}
            onClick={() => handleSpellClick(spell)}
          >
            <span className="spell-list__item-name">{spell.name}</span>
          </div>
        ))}

        {!isLoading && results.length === 0 && (
          <div className="spell-list__empty">No spells match your filters.</div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="spell-list__pagination">
          <button
            className="btn btn--sm"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <span className="spell-list__page-info">
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
}
