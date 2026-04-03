import { useQuery } from '@tanstack/react-query';
import api from './axiosInstance';

/**
 * Browseable paginated spell listing with filters.
 */
export function useSpellBrowse(filters = {}) {
  const { q, source, level, school, tradition, category, spellType, actionCost,
          limit = 20, skip = 0, gameSystem = '5e' } = filters;
  return useQuery({
    queryKey: ['spells', 'browse', { q, source, level, school, tradition, category,
               spellType, actionCost, limit, skip, gameSystem }],
    queryFn: async () => {
      const params = { limit, skip, gameSystem };
      if (q && q.trim().length >= 1) params.q = q.trim();
      if (source) params.source = source;
      if (level !== undefined && level !== '') params.level = level;
      if (school) params.school = school;
      if (tradition) params.tradition = tradition;
      if (category) params.category = category;
      if (spellType) params.spellType = spellType;
      if (actionCost) params.actionCost = actionCost;
      const { data } = await api.get('/spells/search', { params });
      return data;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: prev => prev,
  });
}

/**
 * Full spell by slug.
 */
export function useSpell(slug) {
  return useQuery({
    queryKey: ['spells', 'detail', slug],
    queryFn: async () => {
      const { data } = await api.get(`/spells/${slug}`);
      return data;
    },
    enabled: !!slug,
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Available spell source books.
 */
export function useSpellSources(gameSystem = '5e') {
  return useQuery({
    queryKey: ['spells', 'sources', gameSystem],
    queryFn: async () => {
      const { data } = await api.get('/spells/sources', {
        params: { gameSystem },
      });
      return data;
    },
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * Lightweight spell name index for spell linking in stat blocks.
 */
export function useSpellNames(gameSystem = '5e') {
  return useQuery({
    queryKey: ['spells', 'names', gameSystem],
    queryFn: async () => {
      const { data } = await api.get('/spells/names', { params: { gameSystem } });
      return data;
    },
    staleTime: 60 * 60 * 1000,
  });
}
