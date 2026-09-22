import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import FindingsAnalytics from '../FindingsAnalytics';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../../utils/useDashboardConfig', () => ({
  useDashboardConfig: () => ({
    config: [
      { widgetId: 'analytics-kpi-cards', visible: true },
      { widgetId: 'analytics-tabs', visible: true },
    ],
    canCustomize: true,
    setEditMode: vi.fn(),
  }),
}));

vi.mock('../../components/DashboardCustomizer', () => ({
  default: () => <div data-testid="dashboard-customizer" />,
}));

describe('FindingsAnalytics Page (FA-01 -> FA-06)', { timeout: 15000 }, () => {
  const mockAnalyticsData = {
    byUnit: [
      { unit: 'CN Sài Gòn', Critical: 2, High: 5, Medium: 3, Low: 1, total: 11 },
      { unit: 'CN Hoàn Kiếm', Critical: 1, High: 3, Medium: 4, Low: 2, total: 10 },
    ],
    byProcess: [
      { process: 'Thẩm định hồ sơ tín dụng', total: 15, Critical: 2, High: 6 },
      { process: 'Quản lý tài sản bảo đảm', total: 9, Critical: 1, High: 3 },
    ],
    byCorrectiveUnit: [
      { department: 'Khối Khách hàng Doanh nghiệp', NotStarted: 2, InProgress: 5, Completed: 8, Overdue: 1, total: 16 },
    ],
    byRegion: [
      { region: 'Vùng 1 - Miền Bắc', Critical: 3, High: 8, Medium: 10, Low: 4, total: 25 },
      { region: 'Vùng 2 - Miền Nam', Critical: 2, High: 6, Medium: 7, Low: 3, total: 18 },
    ],
    byOperationType: [
      { operationType: 'TD', Critical: 3, High: 8, Medium: 5, Low: 2, total: 18 },
      { operationType: 'PTD', Critical: 1, High: 3, Medium: 4, Low: 1, total: 9 },
    ],
    byOfficer: {
      proposers: [{ name: 'Nguyễn Văn Chuyên Viên', total: 4, Critical: 1, High: 2, Medium: 1, Low: 0 }],
      appraisers: [{ name: 'Lê Thẩm Định Viên', total: 3, Critical: 0, High: 2, Medium: 1, Low: 0 }],
      leaders: [{ name: 'Trần Trưởng Phòng QTRR', total: 5, Critical: 1, High: 3, Medium: 1, Low: 0 }],
    },
    historyByUnit: [
      {
        unit: 'CN Sài Gòn',
        history: [
          {
            year: 2025,
            engagements: [
              { name: 'Kiểm toán Định kỳ 2025', findingsCount: 8, rating: 'Trung bình' },
            ],
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/audit-findings/stats/multi-dimensional')) {
        return Promise.resolve({ data: mockAnalyticsData });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('FA-01: renders header title and 4 KPI summary cards', async () => {
    render(<FindingsAnalytics />);

    await waitFor(() => {
      expect(screen.getByText(/Báo cáo Phân tích Phát hiện & Lịch sử Đơn vị/i)).toBeDefined();
      expect(screen.getByText('TỔNG PHÁT HIỆN GHI NHẬN')).toBeDefined();
      expect(screen.getByText('PHÁT HIỆN RỦI RO CAO / N.TRỌNG')).toBeDefined();
      expect(screen.getByText('KIẾN NGHỊ ĐANG THEO DÕI')).toBeDefined();
      expect(screen.getByText('TỶ LỆ KHẮC PHỤC KIẾN NGHỊ')).toBeDefined();
    });
  });

  it('FA-02: renders Audited Units tab with bar chart and summary table', async () => {
    render(<FindingsAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('CN Sài Gòn')).toBeDefined();
      expect(screen.getByText('CN Hoàn Kiếm')).toBeDefined();
    });
  });

  it('FA-03: switches to Processes tab and displays process error table', async () => {
    render(<FindingsAnalytics />);

    await waitFor(() => {
      expect(screen.getByText(/Phân tích sai hại theo Quy trình/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/Phân tích sai hại theo Quy trình/i));

    await waitFor(() => {
      expect(screen.getByText('Thẩm định hồ sơ tín dụng')).toBeDefined();
      expect(screen.getByText('Quản lý tài sản bảo đảm')).toBeDefined();
    });
  });

  it('FA-04: switches to Remediation tab and shows corrective unit data', async () => {
    render(<FindingsAnalytics />);

    await waitFor(() => {
      expect(screen.getByText(/Đơn vị chịu trách nhiệm Khắc phục/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/Đơn vị chịu trách nhiệm Khắc phục/i));

    await waitFor(() => {
      expect(screen.getByText(/Tiến độ khắc phục kiến nghị của các đơn vị thực thi/i)).toBeDefined();
    });
  });

  it('FA-05: switches to Regions tab and shows regional risk ranking', async () => {
    render(<FindingsAnalytics />);

    await waitFor(() => {
      expect(screen.getByText(/Phân tích Rủi ro theo Vùng/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/Phân tích Rủi ro theo Vùng/i));

    await waitFor(() => {
      expect(screen.getByText('Vùng 1 - Miền Bắc')).toBeDefined();
      expect(screen.getByText('Vùng 2 - Miền Nam')).toBeDefined();
    });
  });

  it('FA-06: switches to Operation & Officer tab and shows RCA ranking', async () => {
    render(<FindingsAnalytics />);

    await waitFor(() => {
      expect(screen.getByText(/Nghiệp vụ & Nhân sự chịu trách nhiệm/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/Nghiệp vụ & Nhân sự chịu trách nhiệm/i));

    await waitFor(() => {
      expect(screen.getByText('Tín dụng (TD)')).toBeDefined();
      expect(screen.getByText('Nguyễn Văn Chuyên Viên')).toBeDefined();
    });
  });
});
