import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './axiosInstance';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      return data.user;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (body) => {
      const { data } = await api.post('/auth/register', body);
      return data;
    },
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body) => {
      const { data } = await api.post('/auth/login', body);
      return data.user;
    },
    onSuccess: (user) => {
      qc.setQueryData(['auth', 'me'], user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      qc.setQueryData(['auth', 'me'], null);
      qc.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (body) => api.post('/auth/forgot-password', body).then(r => r.data),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (body) => api.post('/auth/reset-password', body).then(r => r.data),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (body) => api.post('/auth/verify-email', body).then(r => r.data),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body) => api.post('/auth/change-password', body).then(r => r.data),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body) => {
      const { data } = await api.patch('/auth/profile', body);
      return data.user;
    },
    onSuccess: (user) => {
      qc.setQueryData(['auth', 'me'], user);
    },
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.delete('/auth/account', { data: body }).then(r => r.data),
    onSuccess: () => {
      qc.setQueryData(['auth', 'me'], null);
      qc.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}
