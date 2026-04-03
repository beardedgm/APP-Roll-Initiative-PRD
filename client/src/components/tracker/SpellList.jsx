import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSpellBrowse, useSpellSources } from '../../api/useSpells';
import useUIStore from '../../store/useUIStore';
import SPELL_SOURCE_BADGES from '../../constants/spellSources';

const LEVEL_OPTIONS = [
  { value: '0', label: 'Cantrip' },
  { value: '1', label: '1st' },
  { value: '2', label: '2nd' },
  { value: '3', label: '3rd' },
  { value: '4', label: '4th' },
  { value: '5', label: '5th' },
  { value: '6', label: '6th' },
  { value: '7', label: '7th' },
  { value: '8', label: '8th' },
  { value: '9', label: '9th' },
];

const SCHOOLS = [
  'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
  'Evocation', 'Illusion', 'Necromancy', 'Transmutation',
];

const PAGE_SIZE = 12;

export default function SpellList({ gameSystem = '5e' }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
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
  function handleSchoolFilter(val) { setSchoolFilter(val); setPage(0); }

  const { data, isLoading } = useSpellBrowse({
    q: debouncedQuery,
    source: sourceFilter,
    level: levelFilter,
    school: schoolFilter,
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

  function levelLabel(lvl) {
    if (lvl === 0) return 'Cantrip';
    return `Lvl ${lvl}`;
  }

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
            <option value="">All Levels</option>
            {LEVEL_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="spell-list__filter-row">
          <select
            className="spell-list__select spell-list__select--full"
            value={schoolFilter}
            onChange={e => handleSchoolFilter(e.target.value)}
          >
            <option value="">All Schools</option>
            {SCHOOLS.map(s => (
              <option key={s} value={s}>{s}</option>
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
            <div className="spell-list__item-main">
              <span className="spell-list__item-name">{spell.name}</span>
              <span className="spell-list__item-meta">
                {spell.school || 'Unknown school'}
                {spell.classes && spell.classes.length > 0 ? ` \u2022 ${spell.classes.join(', ')}` : ''}
              </span>
            </div>
            <div className="spell-list__item-stats">
              <span className="spell-list__stat" title="Spell Level">
                {levelLabel(spell.level)}
              </span>
              <span className="spell-list__stat" title="Casting Time">
                {spell.castingTime || '\u2014'}
              </span>
              <span className="spell-list__source-badge">
                {SPELL_SOURCE_BADGES[spell.sourceKey] || spell.sourceKey}
              </span>
            </div>
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
