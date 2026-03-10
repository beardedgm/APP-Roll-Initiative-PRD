import { useState, useRef, useEffect } from 'react';
import { useMonsterSearch } from '../../api/useMonsters';
import useUIStore from '../../store/useUIStore';

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

export default function MonsterSearch({ onSelectMonster }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const openModal = useUIStore(s => s.openModal);
  const wrapperRef = useRef(null);
  const timerRef = useRef(null);

  // Debounce search input
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const { data, isLoading } = useMonsterSearch(debouncedQuery);
  const results = data?.results || [];

  function handleSelect(monster) {
    if (onSelectMonster) {
      onSelectMonster(monster);
    }
    setQuery('');
    setDebouncedQuery('');
    setShowDropdown(false);
  }

  function handleViewStatBlock(e, monster) {
    e.stopPropagation();
    useUIStore.getState().setStatBlockSlug(monster.slug);
    openModal('stat-block');
  }

  return (
    <div className="monster-search" ref={wrapperRef}>
      <h3 className="monster-search__title">Monster Search</h3>
      <input
        type="text"
        className="monster-search__input"
        placeholder="Search monsters..."
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
      />

      {showDropdown && debouncedQuery.length >= 2 && (
        <div className="monster-search__dropdown">
          {isLoading && (
            <div className="monster-search__loading">Searching...</div>
          )}
          {!isLoading && results.length === 0 && (
            <div className="monster-search__empty">No monsters found</div>
          )}
          {results.map(m => (
            <div
              key={m.slug}
              className="monster-search__result"
              onClick={() => handleSelect(m)}
            >
              <div className="monster-search__result-left">
                <span className="monster-search__result-name">{m.name}</span>
                <span className="monster-search__result-meta">
                  {m.size} {m.type} &middot; CR {m.cr || '—'} &middot; HP {m.hp}
                </span>
              </div>
              <div className="monster-search__result-right">
                <span className="monster-search__source-badge">
                  {SOURCE_BADGES[m.sourceKey] || m.sourceKey}
                </span>
                <button
                  className="monster-search__view-btn"
                  onClick={e => handleViewStatBlock(e, m)}
                  title="View stat block"
                >
                  &#128214;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
