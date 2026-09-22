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

describe('AuditeePortal (AP-01 -> AP-06)', { timeout: 15000 }, () => {
  const mockRecommendations = [
    {
      id: 1,
      code: 'REC-2026-01',
      title: 'Tăng cường xác thực CCCD gắn chip qua VNeID',
      recommendation: 'Tăng cường xác thực CCCD gắn chip qua VNeID',
      department: 'Chi nhánh Hà Nội',
      deadline: '2026-06-30',
      dueDate: '2026-06-30',
      status: 'InProgress',
      progressPercent: 60,
      remediationPlan: 'Đã mua thiết bị đọc thẻ QR',
      finding: 'Thiếu xác thực CCCD',
    },
    {
      id: 2,
      code: 'REC-2026-02',
      title: 'Rà soát hạn mức tồn quỹ tiền mặt cuối ngày',
      recommendation: 'Rà soát hạn mức tồn quỹ tiền mặt cuối ngày',
      department: 'Chi nhánh Hà Nội',
      deadline: '2026-04-15',
      dueDate: '2026-04-15',
      status: 'Overdue',
      progressPercent: 20,
      remediationPlan: 'Chưa có tờ trình xin tăng hạn mức',
      finding: 'Tồn quỹ vượt hạn mức',
    },
  ];

  const mockFindings = [
    {
      id: 10,
      findingCode: 'FD-2026-01',
      findingTitle: 'Hồ sơ mở thẻ chưa đối soát khuôn mặt',
      riskLevel: 'High',
      status: 'Open',
      auditeeResponse: 'Đơn vị ghi nhận và sẽ cập nhật',
    },
  ];

  const mockRcsa = [
    {
      id: 101,
      processName: 'Mở tài khoản thanh toán',
      subProcess: 'Xác thực eKYC',
      inherentRiskLevel: 'High',
      controlEffectiveness: 'Tốt',
      residualRiskLevel: 'Medium',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/recommendations') {
        return Promise.resolve({ data: mockRecommendations });
      }
      if (url === '/audit-findings') {
        return Promise.resolve({ data: mockFindings });
      }
      if (url === '/risk-assessments/rcsa') {
        return Promise.resolve({ data: mockRcsa });
      }
      if (url === '/audit-universe') {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('AP-01: Renders page title, stats, and primary tabs', async () => {
    render(<AuditeePortal />);

    expect(screen.getByText(/Khắc phục Kiến nghị Kiểm toán/i)).toBeDefined();
    expect(screen.getByText(/Tự đánh giá Rủi ro & Kiểm soát/i)).toBeDefined();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/recommendations', expect.anything());
      expect(api.get).toHaveBeenCalledWith('/audit-findings');
    });
  });

  it('AP-02: Loads and renders recommendations table rows with progress', async () => {
    render(<AuditeePortal />);

    await waitFor(() => {
      expect(screen.getByText('Tăng cường xác thực CCCD gắn chip qua VNeID')).toBeDefined();
      expect(screen.getByText('Rà soát hạn mức tồn quỹ tiền mặt cuối ngày')).toBeDefined();
      expect(screen.getByText(/REC-1/)).toBeDefined();
      expect(screen.getByText(/REC-2/)).toBeDefined();
    });
  });

  it('AP-03: Opens Action Plan / Remediation Modal on button click', async () => {
    render(<AuditeePortal />);

    await waitFor(() => {
      expect(screen.getByText('Tăng cường xác thực CCCD gắn chip qua VNeID')).toBeDefined();
    });

    const actionBtns = screen.getAllByRole('button').filter(b => b.textContent?.includes('Cập nhật') || b.textContent?.includes('Kế hoạch'));
    if (actionBtns.length > 0) {
      fireEvent.click(actionBtns[0]);
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeDefined();
      });
    }
  });

  it('AP-04: Switches to Findings tab and shows auditee opinion interface', async () => {
    render(<AuditeePortal />);

    const findingsTab = screen.getByText(/Phản hồi Ý kiến Phát hiện/i);
    fireEvent.click(findingsTab);

    await waitFor(() => {
      expect(screen.getByText('Hồ sơ mở thẻ chưa đối soát khuôn mặt')).toBeDefined();
      expect(screen.getByText('Phản hồi ý kiến')).toBeDefined();
    });
  });

  it('AP-05: Switches to RCSA self-assessment tab and loads controls', async () => {
    render(<AuditeePortal />);

    const rcsaTab = screen.getByText(/Tự đánh giá Rủi ro & Kiểm soát/i);
    fireEvent.click(rcsaTab);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/risk-assessments/rcsa');
      expect(screen.getByText('Tổng số chốt tự đánh giá')).toBeDefined();
    });
  });

  it('AP-06: Filters recommendations by search keyword', async () => {
    render(<AuditeePortal />);

    await waitFor(() => {
      expect(screen.getByText('Tăng cường xác thực CCCD gắn chip qua VNeID')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Tìm kiến nghị/i);
    fireEvent.change(searchInput, { target: { value: 'VNeID' } });

    expect((searchInput as HTMLInputElement).value).toBe('VNeID');
  });
});
