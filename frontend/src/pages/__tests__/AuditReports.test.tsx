import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AuditReports from '../AuditReports';
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

vi.mock('../../components/TipTapEditor', () => ({
  default: () => <div data-testid="tiptap-editor-mock">TipTap Editor Mock</div>,
}));

vi.mock('../../components/ReportExportButton', () => ({
  default: ({ label }: { label: string }) => <button data-testid="report-export-btn">{label}</button>,
}));

describe('AuditReports Page (AR-01 -> AR-06)', { timeout: 15000 }, () => {
  const mockReports = [
    {
      id: 1,
      title: 'Báo cáo Kiểm toán Hoạt động Tín dụng CN Sài Gòn',
      plan: 'Cuộc kiểm toán CN Sài Gòn 2026',
      engagementId: 10,
      date: '2026-05-20',
      status: 'Draft',
      auditRating: 'NeedsImprovement',
      managerReviewCount: 1,
      executiveSummary: 'Tóm tắt báo cáo kiểm toán...',
    },
    {
      id: 2,
      title: 'Báo cáo Kiểm toán Hệ thống Thanh toán Điện tử',
      plan: 'Kiểm toán Khối CNTT 2026',
      engagementId: 11,
      date: '2026-04-15',
      status: 'Reviewed',
      auditRating: 'Satisfactory',
      managerReviewCount: 2,
      executiveSummary: 'Hệ thống vận hành an toàn...',
    },
  ];

  const mockEngagements = [
    { id: 10, name: 'Cuộc kiểm toán CN Sài Gòn 2026' },
    { id: 11, name: 'Kiểm toán Khối CNTT 2026' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/audit-reports') {
        return Promise.resolve({ data: mockReports });
      }
      if (url === '/audit-engagements') {
        return Promise.resolve({ data: mockEngagements });
      }
      if (url.startsWith('/audit-reports/1')) {
        return Promise.resolve({ data: mockReports[0] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('AR-01: Renders page title, workflow steps, and action buttons', async () => {
    render(<AuditReports />);

    expect(screen.getByText('Báo cáo Kiểm toán')).toBeDefined();
    expect(screen.getByText('Dự thảo mới')).toBeDefined();
    expect(screen.getByText('Tự động tạo từ Phát hiện (AI)')).toBeDefined();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/audit-reports');
      expect(api.get).toHaveBeenCalledWith('/audit-engagements');
    });
  });

  it('AR-02: Loads and renders report items in table with rating and plan', async () => {
    render(<AuditReports />);

    await waitFor(() => {
      expect(screen.getByText('Báo cáo Kiểm toán Hoạt động Tín dụng CN Sài Gòn')).toBeDefined();
      expect(screen.getByText('Cuộc kiểm toán CN Sài Gòn 2026')).toBeDefined();
      expect(screen.getByText('Báo cáo Kiểm toán Hệ thống Thanh toán Điện tử')).toBeDefined();
      expect(screen.getByText('🟡 Cần cải thiện')).toBeDefined();
      expect(screen.getByText('🟢 Đạt yêu cầu')).toBeDefined();
    });
  });

  it('AR-03: Triggers status transitions (Draft -> PendingReview)', async () => {
    (api.post as any).mockResolvedValueOnce({ data: { success: true } });

    render(<AuditReports />);

    await waitFor(() => {
      expect(screen.getByText('Báo cáo Kiểm toán Hoạt động Tín dụng CN Sài Gòn')).toBeDefined();
    });

    const sendBtns = screen.getAllByRole('button').filter(b => b.querySelector('.anticon-send'));
    expect(sendBtns.length).toBeGreaterThan(0);
    fireEvent.click(sendBtns[0]);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/audit-reports/1/transition', { newStatus: 'PendingReview' });
    });
  });

  it('AR-04: Switches to Form view when clicking "Dự thảo mới"', async () => {
    render(<AuditReports />);

    const newBtn = screen.getByText('Dự thảo mới');
    fireEvent.click(newBtn);

    await waitFor(() => {
      expect(screen.getByText(/Dự thảo Báo cáo Kiểm toán mới/i)).toBeDefined();
    });
  });

  it('AR-05: Opens Detail Modal when clicking report title link', async () => {
    render(<AuditReports />);

    await waitFor(() => {
      expect(screen.getByText('Báo cáo Kiểm toán Hoạt động Tín dụng CN Sài Gòn')).toBeDefined();
    });

    const titleLink = screen.getByText('Báo cáo Kiểm toán Hoạt động Tín dụng CN Sài Gòn');
    fireEvent.click(titleLink);

    await waitFor(() => {
      expect(screen.getByText('Xuất Word (.docx)')).toBeDefined();
    });
  });

  it('AR-06: Triggers export API when clicking PDF export button', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/export/pdf')) {
        return Promise.resolve({ data: new Blob(['fake-pdf'], { type: 'application/pdf' }) });
      }
      if (url === '/audit-reports') return Promise.resolve({ data: mockReports });
      if (url === '/audit-engagements') return Promise.resolve({ data: mockEngagements });
      return Promise.resolve({ data: [] });
    });

    render(<AuditReports />);

    await waitFor(() => {
      expect(screen.getByText('Báo cáo Kiểm toán Hoạt động Tín dụng CN Sài Gòn')).toBeDefined();
    });

    const pdfBtns = screen.getAllByRole('button').filter(b => b.querySelector('.anticon-file-pdf'));
    expect(pdfBtns.length).toBeGreaterThan(0);
    fireEvent.click(pdfBtns[0]);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/audit-reports/1/export/pdf', expect.anything());
    });
  });
});
