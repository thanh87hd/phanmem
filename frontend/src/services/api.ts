const t = (k: string, f?: string) => f || k;
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tự động gắn các config cần thiết cho mỗi request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Xử lý lỗi 401: redirect về login (trừ các endpoint auth xử lý riêng trong component)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/auth/change-password') || 
                             url.includes('/auth/login') || 
                             url.includes('/auth/2fa');
      const isLoginPage = window.location.pathname === '/login';
      if (!isLoginPage && !isAuthEndpoint) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

