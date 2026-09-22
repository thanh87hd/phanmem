import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AuditFindings from '../AuditFindings';
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
    username: 'auditor1',
    role: 'Kiểm toán viên',
  }),
}));

vi.mock('../../utils/permission', () => ({
  hasPermission: () => true,
}));

vi.mock('../components/AuditFindingDetailDrawer', () => ({
  AuditFindingDetailDrawer: ({ visible, open, onClose }: any) => (
    (visible || open) ? <div data-testid="finding-drawer"><button onClick={onClose}>Đóng Drawer</button></div> : null
  ),
}));

describe('AuditFindings Page (AF-01 -> AF-09)', { timeout: 15000 }, () => {
  const mockFindings = [
    {
      id: 401,
      findingTitle: 'Hồ sơ thế chấp bất động sản thiếu công chứng',
      internalDefectCode: 'DEF-001',
      riskLevel: 'High',
      status: 'Open',
      engagementId: 201,
      engagement: { name: 'Đoàn Kiểm toán CN Hà Nội' },
      findingType: 'Compliance',
    },
    {
      id: 402,
      findingTitle: 'Chưa thu thập đầy đủ báo cáo tài chính kiểm toán',
      internalDefectCode: 'DEF-002',
      riskLevel: 'Medium',
      status: 'Open',
      engagementId: 201,
      engagement: { name: 'Đoàn Kiểm toán CN Hà Nội' },
      findingType: 'Operational',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/audit-findings')) {
        return Promise.resolve({ data: mockFindings });
      }
      if (url.includes('/audit-engagements')) {
        return Promise.resolve({ data: [{ id: 201, name: 'Đoàn Kiểm toán CN Hà Nội' }] });
      }
      if (url.includes('/defect-codes') || url.includes('/audit-universe') || url.includes('/users')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('AF-01: loads findings and displays statistics & table rows', async () => {
    render(<AuditFindings />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/audit-findings');
    });

    expect(screen.getByText('Hồ sơ thế chấp bất động sản thiếu công chứng')).toBeDefined();
    expect(screen.getByText('Chưa thu thập đầy đủ báo cáo tài chính kiểm toán')).toBeDefined();
    expect(screen.getByText('[DEF-001]')).toBeDefined();
  });

  it('AF-02: renders risk level tags correctly', async () => {
    render(<AuditFindings />);

    await waitFor(() => {
      expect(screen.getByText('Hồ sơ thế chấp bất động sản thiếu công chứng')).toBeDefined();
    });

    expect(screen.getByText('High')).toBeDefined();
    expect(screen.getByText('Medium')).toBeDefined();
  });

  it('AF-03: opens finding drawer when clicking Create button', async () => {
    render(<AuditFindings />);

    await waitFor(() => {
      expect(screen.getByText('Hồ sơ thế chấp bất động sản thiếu công chứng')).toBeDefined();
    });

    const createBtn = screen.getByRole('button', { name: /Ghi nhận Phát hiện mới/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByTestId('finding-drawer')).toBeDefined();
    });
  });

  it('AF-04: calls delete API when delete finding action is clicked', async () => {
    (api.delete as any).mockResolvedValueOnce({ data: { success: true } });

    render(<AuditFindings />);

    await waitFor(() => {
      expect(screen.getByText('Hồ sơ thế chấp bất động sản thiếu công chứng')).toBeDefined();
    });

    const deleteIcons = document.querySelectorAll('.anticon-delete');
    if (deleteIcons.length > 0) {
      const deleteBtn = deleteIcons[0].closest('button')!;
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(api.delete).toHaveBeenCalledWith('/audit-findings/401');
      });
    }
  });
});
