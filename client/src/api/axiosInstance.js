import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 10000,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// H-5: Redirect on 401 (session expired) and 403 (subscription required)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/me')) {
      window.location.href = '/login';
    }
    if (error.response?.status === 403 && error.response?.data?.error?.includes('subscription')) {
      window.location.href = '/pricing';
    }
    return Promise.reject(error);
  }
);

export default api;
