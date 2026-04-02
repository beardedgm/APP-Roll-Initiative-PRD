import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './axiosInstance';

export function useEncounters(options = {}) {
  return useQuery({
    queryKey: ['encounters'],
    queryFn: async () => {
      const { data } = await api.get('/encounters');
      return data.encounters;
    },
    enabled: options.enabled !== false,
  });
}

export function useEncounter(id) {
  return useQuery({
    queryKey: ['encounters', id],
    queryFn: async () => {
      const { data } = await api.get(`/encounters/${id}`);
      return data.encounter;
    },
    enabled: !!id,
  });
}

export function useCreateEncounter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (encounterData) => {
      const { data } = await api.post('/encounters', encounterData);
      return data.encounter;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['encounters'] }),
  });
}

export function useUpdateEncounter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data } = await api.put(`/encounters/${id}`, updates);
      return data.encounter;
    },
    onSuccess: (data) => {
      qc.setQueryData(['encounters', data._id], data);
      qc.invalidateQueries({ queryKey: ['encounters'] });
    },
  });
}

export function useDeleteEncounter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/encounters/${id}`);
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['encounters'] }),
  });
}

export function useShareEncounter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.post(`/encounters/${id}/share`);
      return { id, shareCode: data.shareCode };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['encounters'] }),
  });
}

export function useUnshareEncounter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/encounters/${id}/share`);
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['encounters'] }),
  });
}

export function useSharedEncounter(code) {
  return useQuery({
    queryKey: ['shared-encounter', code],
    queryFn: async () => {
      const { data } = await api.get(`/shared/${code}`);
      return data.encounter;
    },
    enabled: !!code,
    refetchInterval: 2000, // Poll every 2 seconds
    refetchIntervalInBackground: true, // Keep polling when tab is in background (TV display)
  });
}
