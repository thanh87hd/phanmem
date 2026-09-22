import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Recommendations from '../Recommendations';
import api from '../../services/api';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ state: null }),
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

describe('Recommendations Page (RC-01 -> RC-06)', { timeout: 15000 }, () => {
  const mockRecs = [
    {
      id: 501,
      finding: 'Hồ sơ thế chấp bất động sản thiếu công chứng',
      recommendation: 'Bổ sung ngay văn bản công chứng từ văn phòng công chứng',
      department: 'Phòng Tín dụng',
      auditeeOwnerName: 'Nguyễn Văn A',
      ktnbReviewerName: 'Trần KTV',
      assignedTo: 'Trần KTV',
      dueDate: '2026-12-31',
      status: 'InProgress',
      closureStatus: 'Open',
      progress: 60,
      extensionStatus: 'Pending',
      line2Department: 'Khối Quản trị Rủi ro',
      line2MonitoringStatus: 'Monitoring',
      line2Notes: 'Đang rà soát tiến độ định giá lại',
      selfMonitored: true,
      selfMonitorFrequency: 'quarterly',
    },
    {
      id: 502,
      finding: 'Chưa đối chiếu số dư tiền gửi định kỳ',
      recommendation: 'Ban hành quy trình đối chiếu số dư bắt buộc cuối quý',
      department: 'Phòng Kế toán',
      auditeeOwnerName: 'Lê Thị B',
      ktnbReviewerName: 'Phạm KTV',
      dueDate: '2026-06-30',
      status: 'Completed',
      closureStatus: 'Closed',
      progress: 100,
      extensionStatus: 'None',
      line2Department: 'Khối Tuân thủ',
      line2MonitoringStatus: 'Satisfied',
    },
  ];

  const mockStats = {
    total: 2,
    completed: 1,
    verified: 0,
    inProgress: 1,
    overdue: 0,
    pendingTeamLeadOpinion: 0,
    slaChuaDenHan: 2,
    slaQuaHan: 0,
    slaGiaHan: 1,
    selfMonitoredCount: 1,
  };

  const mockFindings = [
    { id: 401, findingTitle: 'Hồ sơ thế chấp bất động sản thiếu công chứng' },
  ];

  const mockDepartments = [
    { id: 1, name: 'Phòng Tín dụng', code: 'TD' },
    { id: 2, name: 'Khối Quản trị Rủi ro', code: 'QTRR' },
  ];

  const mockUsers = [
    { id: 10, fullName: 'Nguyễn Văn A', department: 'Phòng Tín dụng' },
    { id: 20, fullName: 'Trần KTV', department: 'Khối KTNB' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/recommendations') return Promise.resolve({ data: mockRecs });
      if (url === '/recommendations/stats') return Promise.resolve({ data: mockStats });
      if (url === '/audit-findings') return Promise.resolve({ data: mockFindings });
      if (url === '/departments') return Promise.resolve({ data: mockDepartments });
      if (url === '/users') return Promise.resolve({ data: mockUsers });
      if (url.includes('/custom-fields')) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
    (api.post as any).mockResolvedValue({ data: { success: true } });
    (api.patch as any).mockResolvedValue({ data: { success: true } });
  });

  it('RC-01: renders recommendation list, stats cards, and action buttons', async () => {
    render(<Recommendations />);

    await waitFor(() => {
      expect(screen.getByText('Bổ sung ngay văn bản công chứng từ văn phòng công chứng')).toBeDefined();
      expect(screen.getByText('Ban hành quy trình đối chiếu số dư bắt buộc cuối quý')).toBeDefined();
    });

    // Check stats
    expect(screen.getByText('Tổng cộng')).toBeDefined();
    expect(screen.getByText('Tạo Kiến nghị')).toBeDefined();
    expect(screen.getByText('Kiểm tra Quá hạn')).toBeDefined();
  });

  it('RC-02: displays closure status, owners and Tuyến 2 info', async () => {
    render(<Recommendations />);

    await waitFor(() => {
      expect(screen.getByText(/ĐVĐKT: Nguyễn Văn A/)).toBeDefined();
      expect(screen.getByText(/KTNB: Trần KTV/)).toBeDefined();
      expect(screen.getByText('Khối Quản trị Rủi ro')).toBeDefined();
    });
  });

  it('RC-03: renders "Duyệt gia hạn ⏳" button for pending extension and opens review modal', async () => {
    render(<Recommendations />);

    await waitFor(() => {
      expect(screen.getByText('Duyệt gia hạn ⏳')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Duyệt gia hạn ⏳'));

    await waitFor(() => {
      expect(screen.getByText(/Phê duyệt Đơn Đề xuất Gia hạn/)).toBeDefined();
    });
  });

  it('RC-04: triggers Tuyến 2 monitoring modal when clicking "Tuyến 2 giám sát"', async () => {
    render(<Recommendations />);

    await waitFor(() => {
      const line2Btns = screen.getAllByText('Tuyến 2 giám sát');
      expect(line2Btns.length).toBeGreaterThan(0);
      fireEvent.click(line2Btns[0]);
    });

    await waitFor(() => {
      expect(screen.getByText(/Báo cáo Giám sát Mẫu Khắc phục/)).toBeDefined();
    });
  });

  it('RC-05: handles "Yêu cầu đóng" and "KTNB xác nhận" action triggers', async () => {
    render(<Recommendations />);

    await waitFor(() => {
      expect(screen.getAllByText('Yêu cầu đóng').length).toBeGreaterThan(0);
    });

    const reqCloseBtn = screen.getAllByText('Yêu cầu đóng')[0];
    fireEvent.click(reqCloseBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/recommendations/501/request-closure', {});
    });

    const ktnbConfirmBtn = screen.getAllByText('KTNB xác nhận')[0];
    fireEvent.click(ktnbConfirmBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/recommendations/501/ktnb-review',
        expect.objectContaining({ notes: expect.any(String) })
      );
    });
  });

  it('RC-06: opens create recommendation modal when clicking "Tạo Kiến nghị"', async () => {
    render(<Recommendations />);

    await waitFor(() => {
      expect(screen.getByText('Tạo Kiến nghị')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Tạo Kiến nghị'));

    await waitFor(() => {
      expect(screen.getByText('Tạo Kiến nghị mới')).toBeDefined();
    });
  });

  it('RC-07: renders closure status filter dropdown with all options', async () => {
    render(<Recommendations />);

    await waitFor(() => {
      expect(screen.getByText('Tất cả quy trình đóng')).toBeDefined();
    });
  });
});
