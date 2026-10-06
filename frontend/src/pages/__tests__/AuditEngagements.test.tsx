import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import AuditEngagements from '../AuditEngagements';
import api from '../../services/api';
import { message } from 'antd';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ state: null }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'vi' },
  }),
}));

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../utils/useCurrentUser', () => ({
  useCurrentUser: () => ({
    id: 1,
    username: 'lead_auditor',
    role: 'Trưởng đoàn kiểm toán',
  }),
}));

vi.mock('../../utils/permission', () => ({
  hasPermission: () => true,
}));

// The antd static `message` API renders into its own global React root that is never
// unmounted by RTL cleanup, which leaves pending React work behind at teardown.
vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('antd')>();
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      loading: vi.fn(),
      open: vi.fn(),
      destroy: vi.fn(),
    },
  };
});

// Mock large child components to ensure fast, isolated testing
vi.mock('../AuditMinutesTab', () => ({
  default: () => <div data-testid="minutes-tab">Biên bản</div>,
}));
vi.mock('../MasterSamplingTab', () => ({
  default: () => <div data-testid="sampling-tab">Chọn mẫu</div>,
}));
vi.mock('../EngagementChangeRequests', () => ({
  default: () => <div data-testid="changes-tab">Thay đổi</div>,
}));

describe('AuditEngagements Page (AE-01 -> AE-07)', () => {
  const mockEngagements = [
    {
      id: 201,
      name: 'Đoàn Kiểm toán CN Hà Nội 2025',
      planName: 'Kế hoạch năm 2025',
      status: 'InProgress',
      leadAuditor: 'Nguyễn Văn Leader',
      tasks: [],
    },
    {
      id: 202,
      name: 'Đoàn Kiểm toán Khối CNTT 2025',
      planName: 'Kế hoạch năm 2025',
      status: 'Done',
      leadAuditor: 'Trần Văn Tech',
      tasks: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/audit-engagements') {
        return Promise.resolve({ data: mockEngagements });
      }
      if (url === '/audit-plans') {
        return Promise.resolve({ data: [{ id: 101, name: 'Kế hoạch năm 2025' }] });
      }
      if (url === '/audit-universe' || url === '/departments' || url === '/users') {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('AE-01: loads and displays engagement list', async () => {
    render(<AuditEngagements />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/audit-engagements');
    });

    expect(screen.getByText('Đoàn Kiểm toán CN Hà Nội 2025')).toBeDefined();
    expect(screen.getByText('Đoàn Kiểm toán Khối CNTT 2025')).toBeDefined();
  });

  it('AE-02: renders status tags with expected labels', async () => {
    render(<AuditEngagements />);

    await waitFor(() => {
      expect(screen.getByText('Đoàn Kiểm toán CN Hà Nội 2025')).toBeDefined();
    });

    expect(screen.getByText('InProgress')).toBeDefined();
    expect(screen.getByText('Done')).toBeDefined();
  });

  it('AE-03: opens new engagement modal when create button is clicked', async () => {
    render(<AuditEngagements />);

    await waitFor(() => {
      expect(screen.getByText('Đoàn Kiểm toán CN Hà Nội 2025')).toBeDefined();
    });

    const createBtn = screen.getByRole('button', { name: /Tạo cuộc KT/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText(/Tạo Cuộc Kiểm toán mới/i)).toBeDefined();
    });
  });

  it('AE-06: delete is a two-step flow — confirmation first, then exactly one DELETE call', async () => {
    (api.delete as any).mockResolvedValueOnce({ data: { success: true } });

    render(<AuditEngagements />);

    await waitFor(() => {
      expect(screen.getByText('Đoàn Kiểm toán CN Hà Nội 2025')).toBeDefined();
    });

    // EngagementListTable renders one danger delete button per row (plan:approve permission)
    const deleteIcons = document.querySelectorAll('.anticon-delete');
    expect(deleteIcons.length).toBeGreaterThan(0);

    const deleteBtn = deleteIcons[0].closest('button') as HTMLButtonElement;
    expect(deleteBtn).not.toBeNull();

    // Step 1: the row icon only opens the confirmation dialog — the API must not be touched.
    fireEvent.click(deleteBtn);
    expect(api.delete).not.toHaveBeenCalled();

    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain(
      'Bạn có chắc chắn muốn xóa cuộc kiểm toán "Đoàn Kiểm toán CN Hà Nội 2025"? Hành động này không thể hoàn tác.',
    );

    // Step 2: confirming sends the destructive request exactly once.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xóa' }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledTimes(1);
    });
    expect(api.delete).toHaveBeenCalledWith('/audit-engagements/201');

    // The list is re-fetched after a successful delete
    await waitFor(() => {
      const engagementFetches = vi
        .mocked(api.get)
        .mock.calls.filter((call) => call[0] === '/audit-engagements');
      expect(engagementFetches.length).toBe(2);
    });
  });

  it('AE-07: cancelling the confirmation never calls the delete API', async () => {
    render(<AuditEngagements />);

    await waitFor(() => {
      expect(screen.getByText('Đoàn Kiểm toán CN Hà Nội 2025')).toBeDefined();
    });

    const deleteIcons = document.querySelectorAll('.anticon-delete');
    expect(deleteIcons.length).toBeGreaterThan(0);

    const deleteBtn = deleteIcons[0].closest('button') as HTMLButtonElement;
    expect(deleteBtn).not.toBeNull();
    fireEvent.click(deleteBtn);

    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain(
      'Bạn có chắc chắn muốn xóa cuộc kiểm toán "Đoàn Kiểm toán CN Hà Nội 2025"? Hành động này không thể hoàn tác.',
    );

    fireEvent.click(within(dialog).getByRole('button', { name: 'Hủy' }));

    // Cancelling performs no DELETE call, no success notice and no refetch.
    // (antd keeps the closed portal mounted — its leave transition never finishes under jsdom —
    // so the observable contract is asserted on the API/message side, not on DOM removal.)
    expect(api.delete).not.toHaveBeenCalled();
    expect(message.success).not.toHaveBeenCalled();

    const engagementFetches = vi
      .mocked(api.get)
      .mock.calls.filter((call) => call[0] === '/audit-engagements');
    expect(engagementFetches.length).toBe(1);
  });
});
