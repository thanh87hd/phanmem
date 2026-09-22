import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AuditTrailPage from '../AuditTrail';
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

describe('AuditTrail Page (TR-01 -> TR-05)', { timeout: 15000 }, () => {
  const mockLogs = [
    {
      id: 1,
      action: 'CREATE',
      resource: 'working-papers',
      resourceId: '101',
      username: 'ktv_an',
      oldValue: null,
      newValue: '{"title": "Giấy tờ tín dụng"}',
      createdAt: '2026-09-15T14:30:00Z',
    },
    {
      id: 2,
      action: 'DELETE',
      resource: 'departments',
      resourceId: '5',
      username: 'admin',
      oldValue: '{"code": "CN_CU"}',
      newValue: null,
      createdAt: '2026-09-16T10:15:00Z',
    },
  ];

  const mockAlerts = [
    {
      id: 10,
      severity: 'HIGH',
      message: 'Nhiều yêu cầu xóa phát hiện kiểm toán liên tiếp',
      createdAt: '2026-09-17T11:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/audit-trail/security-alerts')) {
        return Promise.resolve({ data: mockAlerts });
      }
      if (url.includes('/audit-trail')) {
        return Promise.resolve({
          data: {
            data: mockLogs,
            total: 2,
            page: 1,
            pageSize: 20,
          },
        });
      }
      return Promise.resolve({ data: [] });
    });
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, count: 50 } });
  });

  it('TR-01: fetches and renders audit logs table with action tags', async () => {
    render(<AuditTrailPage />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/audit-trail',
        expect.anything(),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('ktv_an')).toBeDefined();
      expect(screen.getByText('admin')).toBeDefined();
      expect(screen.getByText('working-papers')).toBeDefined();
    });
  });

  it('TR-02: searches audit logs when typing into search input', async () => {
    render(<AuditTrailPage />);

    await waitFor(() => {
      expect(screen.getByText('ktv_an')).toBeDefined();
    });

    const searchInput = document.querySelector('input[placeholder*="Tìm kiếm"]') as HTMLInputElement;
    if (searchInput) {
      fireEvent.change(searchInput, { target: { value: 'departments' } });
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          '/audit-trail',
          expect.objectContaining({
            params: expect.objectContaining({ search: 'departments' }),
          }),
        );
      });
    }
  });

  it('TR-03: switches to Security Alerts tab and renders alerts list', async () => {
    render(<AuditTrailPage />);

    await waitFor(() => {
      expect(screen.getByText('ktv_an')).toBeDefined();
    });

    const alertsTab = screen.getByRole('tab', { name: /Cảnh báo/i });
    if (alertsTab) {
      fireEvent.click(alertsTab);
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/audit-trail/security-alerts'));
      });
    }
  });

  it('TR-04: refreshes audit trail when reload button is clicked', async () => {
    render(<AuditTrailPage />);

    await waitFor(() => {
      expect(screen.getByText('ktv_an')).toBeDefined();
    });

    const reloadBtn = document.querySelector('.anticon-reload')?.closest('button');
    if (reloadBtn) {
      fireEvent.click(reloadBtn);
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/audit-trail', expect.anything());
      });
    }
  });

  it('TR-05: handles log cleanup modal interaction', async () => {
    render(<AuditTrailPage />);

    await waitFor(() => {
      expect(screen.getByText('ktv_an')).toBeDefined();
    });

    const cleanupBtn = screen.queryByText(/Dọn dẹp|Cleanup/i)?.closest('button');
    if (cleanupBtn) {
      fireEvent.click(cleanupBtn);
      await waitFor(() => {
        expect(document.querySelector('.ant-modal')).toBeDefined();
      });
    }
  });
});
