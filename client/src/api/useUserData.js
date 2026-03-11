import { useQuery } from '@tanstack/react-query';
import axios from './axiosInstance';

export function useUserData(enabled = true) {
  return useQuery({
    queryKey: ['user-data'],
    queryFn: () => axios.get('/user-data').then(r => r.data),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
