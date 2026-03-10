import { useQuery, useMutation } from '@tanstack/react-query';
import api from './axiosInstance';

export function useBillingStatus() {
  return useQuery({
    queryKey: ['billing', 'status'],
    queryFn: async () => {
      const { data } = await api.get('/billing/status');
      return data;
    },
    retry: false,
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/billing/create-checkout-session');
      return data;
    },
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    },
  });
}

export function useCreatePortalSession() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/billing/create-portal-session');
      return data;
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });
}
