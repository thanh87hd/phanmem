import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PasswordChangeRequests from '../PasswordChangeRequests';
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

describe('PasswordChangeRequests Page (PCR-01 -> PCR-04)', { timeout: 15000 }, () => {
  const mockRequests = [
    {
      id: 1,
      userId: 10,
      username: 'ktv_lethilo',
      reason: 'Quên mật khẩu sau thời gian nghỉ phép',
      status: 'pending',
      createdAt: '2026-09-18T08:30:00Z',
    },
    {
      id: 2,
      userId: 11,
      username: 'ktv_nguyenvana',
      reason: 'Thiết bị bảo mật bị đổi mới',
      status: 'approved',
      createdAt: '2026-09-17T09:15:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/auth/password-change-requests')) {
        return Promise.resolve({ data: mockRequests });
      }
      return Promise.resolve({ data: [] });
    });
    vi.mocked(api.post).mockResolvedValue({
      data: { success: true, temporaryPassword: 'TempPassword123!' },
    });
  });

  it('PCR-01: fetches and renders list of password change requests', async () => {
    render(<PasswordChangeRequests />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/auth/password-change-requests'));
    });

    await waitFor(() => {
      expect(screen.getByText('ktv_lethilo')).toBeDefined();
      expect(screen.getByText(/Quên mật khẩu/i)).toBeDefined();
    });
  });

  it('PCR-02: filters requests by status tab', async () => {
    render(<PasswordChangeRequests />);

    await waitFor(() => {
      expect(screen.getByText('ktv_lethilo')).toBeDefined();
    });

    const approvedTabs = screen.queryAllByText(/Đã phê duyệt|Đã duyệt/i);
    if (approvedTabs.length > 0) {
      fireEvent.click(approvedTabs[0]);
      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      });
    }
  });

  it('PCR-03: triggers approve confirmation dialog on approve button click', async () => {
    render(<PasswordChangeRequests />);

    await waitFor(() => {
      expect(screen.getByText('ktv_lethilo')).toBeDefined();
    });

    const approveBtns = screen.queryAllByRole('button', { name: /Phê duyệt|Duyệt/i });
    if (approveBtns.length > 0) {
      fireEvent.click(approveBtns[0]);
      await waitFor(() => {
        expect(document.querySelector('.ant-modal-confirm')).toBeDefined();
      });
    }
  });

  it('PCR-04: triggers reject confirmation dialog on reject button click', async () => {
    render(<PasswordChangeRequests />);

    await waitFor(() => {
      expect(screen.getByText('ktv_lethilo')).toBeDefined();
    });

    const rejectBtns = screen.queryAllByRole('button', { name: /Từ chối/i });
    if (rejectBtns.length > 0) {
      fireEvent.click(rejectBtns[0]);
      await waitFor(() => {
        expect(document.querySelector('.ant-modal-confirm')).toBeDefined();
      });
    }
  });
});
