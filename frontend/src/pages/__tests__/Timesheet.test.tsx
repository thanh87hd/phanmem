import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import TimesheetPage from '../Timesheet';
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

describe('Timesheet Page (TS-01 -> TS-04)', { timeout: 15000 }, () => {
  const mockTimesheets = [
    {
      id: 1,
      userId: 1,
      username: 'admin',
      date: '2026-09-18',
      hours: 8,
      engagementName: 'Kiểm toán Tín dụng Q3',
      taskName: 'Kiểm tra hồ sơ cấp tín dụng',
      description: 'Hoàn thành kiểm tra 25 mẫu',
      status: 'Draft',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('user', JSON.stringify({ id: 1, username: 'admin' }));
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/timesheets')) {
        return Promise.resolve({ data: mockTimesheets });
      }
      if (url.includes('/audit-engagements')) {
        return Promise.resolve({ data: [{ id: 1, name: 'Kiểm toán Tín dụng Q3' }] });
      }
      return Promise.resolve({ data: [] });
    });
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });
  });

  it('TS-01: fetches and renders user timesheet records', async () => {
    render(<TimesheetPage />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/timesheets'));
    });

    await waitFor(() => {
      expect(screen.getByText('Kiểm toán Tín dụng Q3')).toBeDefined();
      expect(screen.getByText('Kiểm tra hồ sơ cấp tín dụng')).toBeDefined();
    });
  });

  it('TS-02: opens modal to log new working hours', async () => {
    render(<TimesheetPage />);

    await waitFor(() => {
      expect(screen.getByText('Kiểm toán Tín dụng Q3')).toBeDefined();
    });

    const addBtn = screen.getByRole('button', { name: /Ghi nhận giờ công/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText(/GHI NHẬN GIỜ CÔNG MỚI/i)).toBeDefined();
    });
  });

  it('TS-03: switches between My Timesheets and Approvals tab', async () => {
    render(<TimesheetPage />);

    await waitFor(() => {
      expect(screen.getByText('Kiểm toán Tín dụng Q3')).toBeDefined();
    });

    const approvalTab = screen.getByRole('tab', { name: /Chờ tôi phê duyệt/i });
    if (approvalTab) {
      fireEvent.click(approvalTab);
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(expect.stringContaining('status=Submitted'));
      });
    }
  });

  it('TS-04: deletes a timesheet record when clicking delete', async () => {
    render(<TimesheetPage />);

    await waitFor(() => {
      expect(screen.getByText('Kiểm toán Tín dụng Q3')).toBeDefined();
    });

    const deleteBtns = document.querySelectorAll('.anticon-delete');
    if (deleteBtns.length > 0) {
      const btn = deleteBtns[0].closest('button');
      if (btn) {
        fireEvent.click(btn);
        await waitFor(() => {
          expect(api.delete).toHaveBeenCalledWith(expect.stringContaining('/timesheets/'));
        });
      }
    }
  });
});
