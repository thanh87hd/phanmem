import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AuditeePortal from '../AuditeePortal';
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

vi.mock('../../utils/excelExport', () => ({
  exportToExcel: vi.fn(),
  filterRecursive: () => true,
}));

vi.mock('../../components/EvidenceManager', () => ({
  default: () => <div data-testid="evidence-manager-mock">EvidenceManager</div>,
}));

describe('AuditeePortal - Context Banner Verification (TC-AUD-04)', { timeout: 20000 }, () => {
  const mockRecs = [
    {
      id: 701,
      code: 'REC-2026-BKS',
      recommendation: 'Hoàn thiện hồ sơ tín dụng khách hàng VIP theo quy định',
      department: 'CN Thang Long',
      dueDate: '2026-10-30',
      status: 'InProgress',
      progressPercent: 75,
      finding: {
        findingTitle: 'Hồ sơ thiếu chứng minh năng lực tài chính bảo lãnh',
      },
      plan: 'Yêu cầu phòng QLRR thu thập bổ sung báo cáo kiểm toán độc lập',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url.startsWith('/recommendations')) return Promise.resolve({ data: mockRecs });
      if (url.startsWith('/audit-findings')) return Promise.resolve({ data: [] });
      if (url.startsWith('/risk-assessments')) return Promise.resolve({ data: [] });
      if (url.startsWith('/audit-universe')) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
  });

  it('renders recommendation data table properly and opens progress modal with Context Banner (TC-AUD-04)', async () => {
    render(<AuditeePortal />);

    await waitFor(() => {
      expect(screen.getByText(/Hoàn thiện hồ sơ tín dụng khách hàng VIP theo quy định/i)).toBeDefined();
    }, { timeout: 6000 });

    // Click "Cập nhật" button on row
    const updateButtons = screen.getAllByRole('button', { name: /Cập nhật/i });
    expect(updateButtons.length).toBeGreaterThan(0);
    fireEvent.click(updateButtons[0]);

    await waitFor(() => {
      // Modal should display Context Banner with recommendation code, text and related finding
      expect(screen.getByText(/Kiến nghị: REC-2026-BKS/i)).toBeDefined();
      expect(screen.getByText(/Nội dung kiến nghị:/i)).toBeDefined();
      expect(screen.getAllByText(/Hồ sơ thiếu chứng minh năng lực tài chính bảo lãnh/i).length).toBeGreaterThan(0);
    }, { timeout: 6000 });
  });
});
