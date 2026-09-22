import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AuditPlan from '../AuditPlan';
import api from '../../services/api';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
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
    delete: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('../../utils/useCurrentUser', () => ({
  useCurrentUser: () => ({
    id: 1,
    username: 'cae',
    role: 'Trưởng ban KTNB',
  }),
}));

vi.mock('../../utils/permission', () => ({
  hasPermission: () => true,
}));

describe('AuditPlan Page (AP-01 -> AP-08)', () => {
  const mockPlans = [
    {
      id: 101,
      name: 'Kế hoạch kiểm toán năm 2025',
      year: 2025,
      status: 'PendingApproval',
      approvalStatus: 'PendingApproval',
      selectedUnits: [
        { universeId: 1, name: 'Chi nhánh Hà Nội', riskLevel: 'High', justification: 'Quy mô lớn' },
      ],
      createdAt: '2025-01-01',
    },
    {
      id: 102,
      name: 'Kế hoạch kiểm toán năm 2026',
      year: 2026,
      status: 'Approved',
      approvalStatus: 'Approved',
      selectedUnits: [],
      createdAt: '2026-01-01',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/audit-plans') {
        return Promise.resolve({ data: mockPlans });
      }
      if (url.includes('/audit-plans/universe-with-risk') || url === '/audit-universe') {
        return Promise.resolve({
          data: [
            { id: 1, name: 'Chi nhánh Hà Nội', dynamicRiskRating: 'High' },
            { id: 2, name: 'Chi nhánh Đà Nẵng', dynamicRiskRating: 'Low' },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('AP-01: loads and displays audit plans in table with correct status', async () => {
    render(<AuditPlan />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/audit-plans');
    });

    expect(screen.getByText('Kế hoạch kiểm toán năm 2025')).toBeDefined();
    expect(screen.getByText('Kế hoạch kiểm toán năm 2026')).toBeDefined();
    expect(screen.getByText('Chờ phê duyệt')).toBeDefined();
    expect(screen.getByText('Đã phê duyệt')).toBeDefined();
  });

  it('AP-02: shows create modal when clicking Tao ke hoach button', async () => {
    render(<AuditPlan />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/audit-plans');
    });

    const createBtn = screen.getByRole('button', { name: /Tạo Kế hoạch mới/i });
    fireEvent.click(createBtn);

    expect(screen.getByText(/Tạo Kế hoạch Kiểm toán Năm mới/i)).toBeDefined();
  });

  it('AP-04: calls delete API when delete button is clicked', async () => {
    (api.delete as any).mockResolvedValueOnce({ data: { success: true } });

    render(<AuditPlan />);

    await waitFor(() => {
      expect(screen.getByText('Kế hoạch kiểm toán năm 2025')).toBeDefined();
    });

    // Delete buttons have delete icon without text
    const deleteIcons = document.querySelectorAll('.anticon-delete');
    expect(deleteIcons.length).toBeGreaterThan(0);
    const deleteBtn = deleteIcons[0].closest('button')!;
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/audit-plans/101');
    });
  });

  it('AP-07 & AP-08: displays approval action buttons (Duyệt & Từ chối) for PendingApproval plan', async () => {
    render(<AuditPlan />);

    await waitFor(() => {
      expect(screen.getByText('Kế hoạch kiểm toán năm 2025')).toBeDefined();
    });

    // Plan with PendingApproval has "Duyệt" and "Từ chối" buttons
    const approveBtn = screen.getByRole('button', { name: /Duyệt/i });
    const rejectBtn = screen.getByRole('button', { name: /Từ chối/i });
    expect(approveBtn).toBeDefined();
    expect(rejectBtn).toBeDefined();
  });
});
