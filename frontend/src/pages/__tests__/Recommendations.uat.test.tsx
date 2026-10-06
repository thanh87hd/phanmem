import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Recommendations from '../Recommendations';
import api from '../../services/api';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ search: '', state: null }),
}));

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

vi.mock('../../utils/excelExport', () => ({
  exportToExcel: vi.fn(),
  filterRecursive: () => true,
}));

describe('Recommendations - UAT Verification (TC-REC-02)', { timeout: 15000 }, () => {
  const mockRecs = [
    {
      id: 601,
      code: 'REC-2026-001',
      finding: 'Chưa đối chiếu công nợ liên chi nhánh',
      recommendation: 'Thực hiện đối chiếu số dư công nợ toàn hệ thống',
      department: { id: 1, name: 'Khối Kế toán' },
      dueDate: '2026-10-15',
      status: 'Completed',
      closureStatus: 'PendingKTNBReview',
      progressPercent: 100,
      auditeeOwnerName: 'Nguyen Van Auditee',
      ktnbReviewerName: 'KTV Datnc',
    },
    {
      id: 602,
      code: 'REC-2026-002',
      finding: 'Hồ sơ tín dụng thiếu bảo hiểm tài sản',
      recommendation: 'Mua bổ sung bảo hiểm cháy nổ cho kho hàng thế chấp',
      department: { id: 2, name: 'CN Ha Noi' },
      dueDate: '2026-11-20',
      status: 'InProgress',
      closureStatus: 'Open',
      progressPercent: 40,
      auditeeOwnerName: 'Tran Van B',
      ktnbReviewerName: 'KTV Datnc',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url.startsWith('/recommendations/stats')) {
        return Promise.resolve({ data: { total: 2, completed: 1, inProgress: 1 } });
      }
      if (url.startsWith('/recommendations')) {
        return Promise.resolve({ data: mockRecs });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('renders quick tabs including "Chờ KTV nghiệm thu" tab with badge count (TC-REC-02)', async () => {
    render(<Recommendations />);

    await waitFor(() => {
      expect(screen.getAllByText(/Chờ KTV nghiệm thu/i).length).toBeGreaterThan(0);
      expect(screen.getByRole('tab', { name: /Tất cả/i })).toBeDefined();
      expect(screen.getByRole('tab', { name: /Đang khắc phục/i })).toBeDefined();
    });
  });

  it('renders highlighted "Nghiệm thu đóng 📋" button for 100% completed recommendation', async () => {
    render(<Recommendations />);

    // Lưu ý: lần render bảng antd (nhiều cột + fixed column) đầu tiên trong file này
    // tốn > 1s, vượt quá timeout mặc định 1000ms của waitFor → phải đặt timeout tường minh,
    // nếu không test sẽ flaky tuỳ theo tải máy.
    await waitFor(
      () => {
        const verifyBtn = screen.getByRole('button', {
          name: /Nghiệm thu đóng 📋/i,
        });
        expect(verifyBtn).toBeDefined();
      },
      { timeout: 8000 },
    );
  });

  it('filters data when clicking "Chờ KTV nghiệm thu" quick tab', async () => {
    render(<Recommendations />);

    // Trước khi lọc: cả kiến nghị đã 100% (601) và kiến nghị đang khắc phục (602) đều hiển thị.
    await waitFor(() => {
      expect(screen.getByText(/Thực hiện đối chiếu số dư công nợ toàn hệ thống/i)).toBeDefined();
      expect(screen.getByText(/Mua bổ sung bảo hiểm cháy nổ cho kho hàng thế chấp/i)).toBeDefined();
    });

    const pendingTab = screen.getByText(/Chờ KTV nghiệm thu/i);
    fireEvent.click(pendingTab);

    // Sau khi lọc: chỉ còn kiến nghị Completed/PendingKTNBReview; kiến nghị InProgress 40% phải biến mất.
    await waitFor(() => {
      expect(
        screen.queryByText(/Mua bổ sung bảo hiểm cháy nổ cho kho hàng thế chấp/i),
      ).toBeNull();
    });
    expect(screen.getByText(/Thực hiện đối chiếu số dư công nợ toàn hệ thống/i)).toBeDefined();
  });
});
