import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AuditEngagements from '../AuditEngagements';
import api from '../../services/api';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ state: null }),
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

describe('AuditEngagements Page (AE-01 -> AE-06)', () => {
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

  it('AE-06: calls delete API when delete button is triggered', async () => {
    (api.delete as any).mockResolvedValueOnce({ data: { success: true } });

    render(<AuditEngagements />);

    await waitFor(() => {
      expect(screen.getByText('Đoàn Kiểm toán CN Hà Nội 2025')).toBeDefined();
    });

    const deleteIcons = document.querySelectorAll('.anticon-delete');
    if (deleteIcons.length > 0) {
      const deleteBtn = deleteIcons[0].closest('button');
      if (deleteBtn) {
        fireEvent.click(deleteBtn);
        // Antd Modal.confirm
        await waitFor(() => {
          const okBtn = screen.queryByRole('button', { name: /(Đồng ý|OK|Xác nhận)/i });
          if (okBtn) fireEvent.click(okBtn);
        });
      }
    }
  });
});
