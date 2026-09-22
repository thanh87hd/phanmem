import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import api from '../api';

describe('services/api interceptors', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
    delete (window as any).location;
    window.location = { ...originalLocation, pathname: '/dashboard', href: '/dashboard' } as any;
  });

  afterEach(() => {
    window.location = originalLocation;
    vi.restoreAllMocks();
  });

  describe('request interceptor', () => {
    it('attaches Bearer token when token is present in localStorage', async () => {
      localStorage.setItem('token', 'my-secret-jwt-token');

      // Get the request interceptor handler
      const requestInterceptor = (api.interceptors.request as any).handlers[0];
      const config = { headers: {} };
      const modifiedConfig = await requestInterceptor.fulfilled(config);

      expect(modifiedConfig.headers.Authorization).toBe('Bearer my-secret-jwt-token');
    });

    it('does not attach Authorization header when token is absent', async () => {
      const requestInterceptor = (api.interceptors.request as any).handlers[0];
      const config = { headers: {} };
      const modifiedConfig = await requestInterceptor.fulfilled(config);

      expect(modifiedConfig.headers.Authorization).toBeUndefined();
    });
  });

  describe('response interceptor 401 handling', () => {
    it('clears credentials and redirects to /login on 401 for non-auth endpoints', async () => {
      localStorage.setItem('user', JSON.stringify({ id: 1 }));
      localStorage.setItem('token', 'expired-token');

      const responseInterceptor = (api.interceptors.response as any).handlers[0];
      const error = {
        response: { status: 401 },
        config: { url: '/audit-plans' },
      };

      await expect(responseInterceptor.rejected(error)).rejects.toEqual(error);

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(window.location.href).toBe('/login');
    });

    it('does not redirect on 401 if request is to auth login endpoint', async () => {
      localStorage.setItem('token', 'temp');

      const responseInterceptor = (api.interceptors.response as any).handlers[0];
      const error = {
        response: { status: 401 },
        config: { url: '/auth/login' },
      };

      await expect(responseInterceptor.rejected(error)).rejects.toEqual(error);

      // Token should remain untouched because login handles its own error
      expect(localStorage.getItem('token')).toBe('temp');
      expect(window.location.href).toBe('/dashboard');
    });

    it('does not redirect if current pathname is already /login', async () => {
      window.location.pathname = '/login';
      localStorage.setItem('token', 'temp');

      const responseInterceptor = (api.interceptors.response as any).handlers[0];
      const error = {
        response: { status: 401 },
        config: { url: '/some-data' },
      };

      await expect(responseInterceptor.rejected(error)).rejects.toEqual(error);

      expect(localStorage.getItem('token')).toBe('temp');
    });
  });
});
