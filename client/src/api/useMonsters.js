import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './axiosInstance';

/**
 * Quick search for add-combatant dropdown (min 2 chars).
 */
export function useMonsterSearch(query, options = {}) {
  return useQuery({
    queryKey: ['monsters', 'search', query],
    queryFn: async () => {
      if (!query || query.trim().length < 2) return { results: [], total: 0 };
      const { data } = await api.get('/monsters/search', {
        params: { q: query.trim(), limit: 20 },
      });
      return data;
    },
    enabled: !!query && query.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
    placeholderData: prev => prev,
    ...options,
  });
}

/**
 * Browseable paginated listing with filters.
 */
export function useMonsterBrowse(filters = {}) {
  const { q, source, cr, type, limit = 20, skip = 0 } = filters;
  return useQuery({
    queryKey: ['monsters', 'browse', { q, source, cr, type, limit, skip }],
    queryFn: async () => {
      const params = { limit, skip };
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
export function useMonsterSources() {
  return useQuery({
    queryKey: ['monsters', 'sources'],
    queryFn: async () => {
      const { data } = await api.get('/monsters/sources');
      return data;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Create a custom monster (premium).
 */
export function useCreateMonster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (monsterData) => {
      const { data } = await api.post('/monsters', monsterData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monsters'] });
    },
  });
}

/**
 * Update a custom monster by slug (owner only).
 */
export function useUpdateMonster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ slug, ...updates }) => {
      const { data } = await api.put(`/monsters/${slug}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monsters'] });
    },
  });
}

/**
 * Delete a custom monster by slug (owner only).
 */
export function useDeleteMonster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (slug) => {
      const { data } = await api.delete(`/monsters/${slug}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monsters'] });
    },
  });
}
