import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { message } from 'antd';
import AuditCommitteePortal from '../AuditCommitteePortal';
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

/**
 * UAT: docs/04_Kich_Ban_Kiem_Thu_UAT_KTNB_4.0.md → TC-BKS-01
 *   "Xem Dashboard Giám Sát Mô Hình 3 Tuyến Độc Lập" (/audit-committee-portal, Ban Kiểm Soát)
 *
 * Trang này KHÔNG đi qua router: nó tự gọi API khi mount
 *   GET /dashboard/config/committee?tabKey=default   (useDashboardConfig → widget nào đang bật)
 *   GET /audit-committee/highlights[?departmentId&year&auditUniverse]
 *   GET /audit-committee/3lod[?departmentId&year&auditUniverse]
 *   GET /audit-committee/charters
 * và gọi lại cả 3 endpoint audit-committee mỗi khi cấu hình widget đổi (lần 2 sau khi config tải xong).
 */
describe('AuditCommitteePortal - TC-BKS-01 (Cổng Ban Kiểm Soát)', { timeout: 30000 }, () => {
  const highlightsPayload = {
    criticalFindings: 7,
    highFindings: 13,
    totalIssues: 42,
  };

  const lodPayload = {
    line1: {
      name: 'Kinh doanh & Vận hành (Tuyến 1 - mock)',
      description: 'Chi nhánh tự nhận diện và kiểm soát rủi ro (mock).',
      coverage: 81,
      issues: 21,
    },
    line2: {
      name: 'QLRR & Tuân thủ (Tuyến 2 - mock)',
      description: 'Khối QLRR thiết lập chính sách và giám sát (mock).',
      coverage: 72,
      issues: 9,
    },
    line3: {
      name: 'Kiểm toán Nội bộ (Tuyến 3 - mock)',
      description: 'KTNB đảm bảo độc lập trực tiếp lên BKS (mock).',
      coverage: 63,
      issues: 4,
    },
  };

  const chartersPayload = [
    {
      id: 5,
      version: 'v2.1',
      title: 'Điều lệ KTNB 2025 (dự thảo)',
      effectiveYear: 2025,
      status: 'Draft',
      approvedBy: null,
      updatedAt: '2025-03-01T00:00:00.000Z',
    },
    {
      id: 6,
      version: 'v2.0',
      title: 'Điều lệ KTNB 2024',
      effectiveYear: 2024,
      status: 'Approved',
      approvedBy: 'bks.chair',
      updatedAt: '2024-01-15T00:00:00.000Z',
    },
  ];

  // Cấu hình widget do server trả về: comm-3lod chỉ có "year" → URL phải là ?year=2025
  const committeeServerConfig = {
    canCustomize: false,
    widgets: [
      { widgetId: 'comm-kpi-cards', visible: true, order: 1, size: 'full', settings: { department: 'K.QLRR', year: '2025' } },
      { widgetId: 'comm-3lod', visible: true, order: 2, size: 'full', settings: { year: '2025' } },
      { widgetId: 'comm-charter', visible: true, order: 3, size: 'full', settings: {} },
    ],
  };

  const getMock = api.get as unknown as {
    mock: { calls: unknown[][] };
    mockImplementation: (fn: (url: string, config?: unknown) => unknown) => void;
  };
  const postMock = api.post as unknown as { mock: { calls: unknown[][] } };
  const patchMock = api.patch as unknown as { mock: { calls: unknown[][] } };

  const callsFor = (mock: { mock: { calls: unknown[][] } }, url: string) =>
    mock.mock.calls.filter((call) => call[0] === url).length;

  let successSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    successSpy = vi.spyOn(message, 'success');

    getMock.mockImplementation((url: string) => {
      if (url === '/dashboard/config/committee') {
        return Promise.resolve({ data: committeeServerConfig });
      }
      if (url.startsWith('/audit-committee/highlights')) {
        return Promise.resolve({ data: highlightsPayload });
      }
      if (url.startsWith('/audit-committee/3lod')) {
        return Promise.resolve({ data: lodPayload });
      }
      if (url === '/audit-committee/charters') {
        return Promise.resolve({ data: chartersPayload });
      }
      return Promise.resolve({ data: [] });
    });

    (api.post as any).mockResolvedValue({ data: { success: true } });
    (api.patch as any).mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Lần render bảng/card antd đầu tiên trong file tốn > 1s → phải đặt timeout tường minh. */
  const waitForPortalShell = async () => {
    await waitFor(
      () => {
        expect(screen.getByText('3 Lines of Defense Dashboard')).toBeDefined();
      },
      { timeout: 8000 },
    );
  };

  const cardOf = (label: string): HTMLElement => {
    const node = screen.getByText(label).closest('.ant-card');
    if (!node) throw new Error(`Không tìm thấy card chứa "${label}"`);
    return node as HTMLElement;
  };

  it('TC-BKS-01.A: gọi đúng API khi mount và render 3 tuyến phòng vệ + KPI cảnh báo trọng yếu', async () => {
    render(<AuditCommitteePortal />);

    await waitForPortalShell();

    // 1) Cấu hình dashboard (widget nào đang bật) — gọi kèm params tabKey
    expect(api.get).toHaveBeenCalledWith('/dashboard/config/committee', {
      params: { tabKey: 'default' },
    });

    // 2) Ba endpoint dữ liệu của Cổng BKS. comm-kpi-cards có settings {department, year}
    //    nên URL phải mang đúng query string do component dựng (departmentId + year).
    expect(api.get).toHaveBeenCalledWith('/audit-committee/highlights?departmentId=K.QLRR&year=2025');
    expect(api.get).toHaveBeenCalledWith('/audit-committee/3lod?year=2025');
    expect(api.get).toHaveBeenCalledWith('/audit-committee/charters');

    // 3) Header tổng quan
    expect(screen.getByText('Audit Committee Portal')).toBeDefined();
    expect(
      screen.getByText('Cổng thông tin dành cho Ban Kiểm Soát & Quản trị cấp cao'),
    ).toBeDefined();

    // 4) KPI cảnh báo trọng yếu lấy đúng số từ payload (không phải giá trị mặc định 0)
    expect(within(cardOf('Rủi ro Nghiêm trọng (Critical)')).getByText('7')).toBeDefined();
    expect(within(cardOf('Rủi ro Cao (High)')).getByText('13')).toBeDefined();
    expect(within(cardOf('Tổng Vấn đề Tồn đọng')).getByText('42')).toBeDefined();

    // 5) Ba tuyến phòng vệ: tên + coverage + số vấn đề đều lấy từ /audit-committee/3lod
    const line1 = cardOf('Tuyến 1 (First Line)');
    expect(within(line1).getByText('Kinh doanh & Vận hành (Tuyến 1 - mock)')).toBeDefined();
    expect(within(line1).getByText('81%')).toBeDefined();
    expect(within(line1).getByText('21')).toBeDefined();

    const line2 = cardOf('Tuyến 2 (Second Line)');
    expect(within(line2).getByText('QLRR & Tuân thủ (Tuyến 2 - mock)')).toBeDefined();
    expect(within(line2).getByText('72%')).toBeDefined();
    expect(within(line2).getByText('9')).toBeDefined();

    const line3 = cardOf('Tuyến 3 (Third Line)');
    expect(within(line3).getByText('Kiểm toán Nội bộ (Tuyến 3 - mock)')).toBeDefined();
    expect(within(line3).getByText('63%')).toBeDefined();
    expect(within(line3).getByText('4')).toBeDefined();
  });

  it('TC-BKS-01.B: bảng Điều lệ KTNB hiển thị phiên bản/trạng thái và chỉ cho phê duyệt bản nháp', async () => {
    render(<AuditCommitteePortal />);

    await waitForPortalShell();

    await waitFor(() => {
      expect(screen.getByText('v2.1')).toBeDefined();
    });

    expect(screen.getByText('Quản lý Điều lệ KTNB (Audit Charter)')).toBeDefined();
    expect(screen.getByText('Điều lệ KTNB 2025 (dự thảo)')).toBeDefined();
    expect(screen.getByText('Điều lệ KTNB 2024')).toBeDefined();
    expect(screen.getByText('Dự thảo')).toBeDefined();
    expect(screen.getByText('Đã phê duyệt')).toBeDefined();
    // Quyền hạn IIA (IIA 6.1 / 7.1) render cho mọi dòng
    expect(screen.getAllByText('Quyền tiếp cận toàn diện (IIA 6.1)')).toHaveLength(2);
    expect(screen.getAllByText('Báo cáo trực tiếp BKS (IIA 7.1)')).toHaveLength(2);
    // Chỉ dòng Draft (id=5) có nút Phê duyệt
    expect(screen.getAllByRole('button', { name: 'Phê duyệt' })).toHaveLength(1);

    const approvedRow = screen.getByText('Điều lệ KTNB 2024').closest('tr');
    if (!approvedRow) throw new Error('Không tìm thấy dòng Điều lệ KTNB 2024');
    expect(within(approvedRow as HTMLElement).queryByRole('button', { name: 'Phê duyệt' })).toBeNull();
  });

  it('TC-BKS-01.C: phê duyệt Điều lệ gọi PATCH /audit-committee/charters/:id/approve rồi tải lại dữ liệu', async () => {
    render(<AuditCommitteePortal />);

    await waitForPortalShell();

    const approveButton = await screen.findByRole('button', { name: 'Phê duyệt' });
    const chartersCallsBefore = callsFor(getMock, '/audit-committee/charters');

    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/audit-committee/charters/5/approve');
    });
    // Không gửi body và không gọi endpoint nào khác
    expect(patchMock.mock.calls).toHaveLength(1);
    expect(patchMock.mock.calls[0]).toHaveLength(1);

    expect(successSpy).toHaveBeenCalledWith('Đã phê duyệt Điều lệ');

    // fetchData() phải chạy lại → GET /audit-committee/charters tăng thêm
    await waitFor(() => {
      expect(callsFor(getMock, '/audit-committee/charters')).toBeGreaterThan(chartersCallsBefore);
    });
    expect(callsFor(getMock, '/audit-committee/highlights?departmentId=K.QLRR&year=2025')).toBeGreaterThan(0);
    expect(postMock.mock.calls).toHaveLength(0);
  });
});
