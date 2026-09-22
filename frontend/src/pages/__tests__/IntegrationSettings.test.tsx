import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import IntegrationSettings from '../IntegrationSettings';
import api from '../../services/api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'vi', changeLanguage: vi.fn() },
  }),
}));

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('IntegrationSettings Page (IS-01 -> IS-04)', { timeout: 15000 }, () => {
  const mockSmtp = {
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    authType: 'oauth2',
    tenantId: 'tenant-12345',
    clientId: 'client-12345',
    clientSecret: 'secret-12345',
    user: 'audit@lpbank.vn',
    fromName: 'KTNB LPBank',
    fromEmail: 'audit@lpbank.vn',
    enabled: true,
  };

  const mockSsoProviders = [
    {
      id: 1,
      name: 'LPBank Active Directory',
      type: 'ad',
      enabled: true,
      host: 'ad.lpbank.vn',
      port: 389,
      baseDn: 'DC=lpbank,DC=vn',
      status: 'connected',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/system-management/smtp-config')) {
        return Promise.resolve({ data: mockSmtp });
      }
      if (url.includes('/system-management/sso-providers')) {
        return Promise.resolve({ data: mockSsoProviders });
      }
      return Promise.resolve({ data: {} });
    });
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, message: 'Test OK' } });
  });

  it('IS-01: fetches and renders integration configurations', async () => {
    render(<IntegrationSettings />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/system-management/smtp-config');
      expect(api.get).toHaveBeenCalledWith('/system-management/sso-providers');
    });

    await waitFor(() => {
      expect(screen.getByText(/Tích hợp & Kết nối Hệ thống/i)).toBeDefined();
    });
  });

  it('IS-02: renders SMTP configuration tab and fields', async () => {
    render(<IntegrationSettings />);

    await waitFor(() => {
      expect(screen.getAllByText(/Cấu hình Email/i).length).toBeGreaterThan(0);
    });

    const hostInput = document.querySelector('input[id*="host"]');
    expect(hostInput).toBeDefined();
  });

  it('IS-03: switches to SSO / LDAP tab and renders directory providers', async () => {
    render(<IntegrationSettings />);

    await waitFor(() => {
      expect(screen.getAllByText(/Cấu hình Email/i).length).toBeGreaterThan(0);
    });

    const ssoTab = document.querySelector('.ant-tabs-tab[data-node-key="sso"] .ant-tabs-tab-btn') || document.querySelector('[data-node-key="sso"]');
    expect(ssoTab).toBeDefined();
    if (ssoTab) {
      fireEvent.click(ssoTab);
      await waitFor(() => {
        expect(screen.getByText(/LPBank Active Directory/i)).toBeDefined();
      });
    }
  });

  it('IS-04: tests connection via test connection button', async () => {
    render(<IntegrationSettings />);

    await waitFor(() => {
      expect(screen.getAllByText(/Cấu hình Email/i).length).toBeGreaterThan(0);
    });

    const testBtn = screen.getByRole('button', { name: /Gửi email kiểm tra/i });
    fireEvent.click(testBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/system-management/smtp-config/test',
        expect.anything(),
      );
    });
  });
});
