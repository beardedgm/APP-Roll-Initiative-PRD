import { useQuery } from '@tanstack/react-query';
import api from './axiosInstance';

/**
 * Browseable paginated listing with filters.
 */
export function useMonsterBrowse(filters = {}) {
  const { q, source, cr, type, limit = 20, skip = 0, gameSystem = '5e' } = filters;
  return useQuery({
    queryKey: ['monsters', 'browse', { q, source, cr, type, limit, skip, gameSystem }],
    queryFn: async () => {
      const params = { limit, skip, gameSystem };
      if (q && q.trim().length >= 1) params.q = q.trim();
      if (source) params.source = source;
      if (cr !== undefined && cr !== '') params.cr = cr;
      if (type) params.type = type;
      const { data } = await api.get('/monsters/search', { params });
      return data;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: prev => prev,
  });
}

/**
 * Full stat block by slug.
 */
export function useMonster(slug) {
  return useQuery({
    queryKey: ['monsters', 'detail', slug],
    queryFn: async () => {
      const { data } = await api.get(`/monsters/${slug}`);
      return data;
    },
    enabled: !!slug,
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Available source books.
 */
export function useMonsterSources(gameSystem = '5e') {
  return useQuery({
    queryKey: ['monsters', 'sources', gameSystem],
    queryFn: async () => {
      const { data } = await api.get('/monsters/sources', {
        params: { gameSystem },
      });
      return data;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}
