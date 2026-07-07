import axios from 'axios';
import { isAuthEndpoint } from './authEndpoints';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 10000,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// H-5: Redirect on 401 (session expired) and 403 (subscription required).
// Auth endpoints handle their own errors (a 401 there = wrong password), so
// never redirect for them — that would swallow the form's error message (f6).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isAuthEndpoint(error.config?.url)) {
      window.location.href = '/login';
    }
    if (error.response?.status === 403 && error.response?.data?.error?.includes('subscription')) {
      window.location.href = '/pricing';
    }
    return Promise.reject(error);
  }
);

export default api;
