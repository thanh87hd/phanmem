import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import NotificationBell from '../NotificationBell';
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
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('NotificationBell Component (NB-01 -> NB-04)', { timeout: 15000 }, () => {
  const mockNotifications = [
    {
      id: 1,
      type: 'REVIEW_REQUEST',
      title: 'Yêu cầu soát xét Giấy tờ làm việc',
      message: 'KTV Trần Văn A đã trình WP-TD-01 để soát xét',
      isRead: false,
      createdAt: '2026-09-18T10:00:00Z',
    },
    {
      id: 2,
      type: 'OVERDUE_WARNING',
      title: 'Cảnh báo quá hạn Kiến nghị',
      message: 'Kiến nghị số 14 về phân loại nợ đã quá hạn SLA 5 ngày',
      isRead: true,
      createdAt: '2026-09-17T09:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/notifications/unread-count') {
        return Promise.resolve({ data: { count: 3 } });
      }
      if (url.includes('/notifications')) {
        return Promise.resolve({ data: mockNotifications });
      }
      return Promise.resolve({ data: [] });
    });
    vi.mocked(api.patch).mockResolvedValue({ data: { success: true } });
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
  });

  it('NB-01: fetches unread count and renders bell badge on mount', async () => {
    render(<NotificationBell />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/notifications/unread-count');
      expect(api.get).toHaveBeenCalledWith('/notifications');
    });

    const badge = document.querySelector('.ant-badge-count');
    expect(badge).toBeDefined();
  });

  it('NB-02: opens popover with notification list on bell click', async () => {
    render(<NotificationBell />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/notifications/unread-count');
    });

    const bellBtn = document.querySelector('.anticon-bell') || document.querySelector('.ant-badge');
    fireEvent.click(bellBtn!);

    await waitFor(() => {
      expect(screen.getByText('Yêu cầu soát xét Giấy tờ làm việc')).toBeDefined();
      expect(screen.getByText('Cảnh báo quá hạn Kiến nghị')).toBeDefined();
    });
  });

  it('NB-03: marks a single notification as read when clicked', async () => {
    render(<NotificationBell />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/notifications/unread-count');
    });

    const bellBtn = document.querySelector('.anticon-bell') || document.querySelector('.ant-badge');
    fireEvent.click(bellBtn!);

    await waitFor(() => {
      expect(screen.getByText('Yêu cầu soát xét Giấy tờ làm việc')).toBeDefined();
    });

    const notifItem = screen.getByText('Yêu cầu soát xét Giấy tờ làm việc');
    fireEvent.click(notifItem);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        expect.stringContaining('/notifications/1/read'),
      );
    });
  });

  it('NB-04: marks all notifications as read when clicking mark-all button', async () => {
    render(<NotificationBell />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/notifications/unread-count');
    });

    const bellBtn = document.querySelector('.anticon-bell') || document.querySelector('.ant-badge');
    fireEvent.click(bellBtn!);

    await waitFor(() => {
      expect(screen.getByText(/Đọc tất cả/i)).toBeDefined();
    });

    const readAllBtn = screen.getByText(/Đọc tất cả/i);
    fireEvent.click(readAllBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        expect.stringContaining('/notifications/mark-all-read'),
      );
    });
  });
});
