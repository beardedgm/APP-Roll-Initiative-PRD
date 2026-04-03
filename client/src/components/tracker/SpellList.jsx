import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSpellBrowse, useSpellSources } from '../../api/useSpells';
import useUIStore from '../../store/useUIStore';
import { GAME_SYSTEMS } from '../../../shared/gameSystemConfig.js';

const PAGE_SIZE = 12;

export default function SpellList({ gameSystem = '5e' }) {
  const config = GAME_SYSTEMS[gameSystem];
  const spellConfig = config.spells;

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [primaryFilter, setPrimaryFilter] = useState('');
  const [page, setPage] = useState(0);
  const timerRef = useRef(null);

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
  function handlePrimaryFilter(val) { setPrimaryFilter(val); setPage(0); }

  const { data, isLoading } = useSpellBrowse({
    q: debouncedQuery,
    source: sourceFilter,
    level: levelFilter,
    [spellConfig.primaryFilter.paramName]: primaryFilter,
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
            <option value="">{spellConfig.levelAllLabel}</option>
            {spellConfig.levelOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="spell-list__filter-row">
          <select
            className="spell-list__select spell-list__select--full"
            value={primaryFilter}
            onChange={e => handlePrimaryFilter(e.target.value)}
          >
            <option value="">{spellConfig.primaryFilter.label}</option>
            {spellConfig.primaryFilter.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
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
