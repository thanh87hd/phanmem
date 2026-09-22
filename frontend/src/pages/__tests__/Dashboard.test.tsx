import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Dashboard from '../Dashboard';
import api from '../../services/api';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
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

vi.mock('../../utils/useCurrentUser', () => ({
  useCurrentUser: () => ({
    id: 1,
    username: 'admin',
    fullName: 'Quản trị viên Hệ thống',
    role: { id: 1, name: 'Admin' },
  }),
}));

vi.mock('../../utils/permission', () => ({
  hasPermission: () => true,
}));

vi.mock('../../utils/role-checker.util', () => ({
  getUserScope: () => ({ level: 'GLOBAL' }),
}));

vi.mock('../../utils/useDashboardConfig', () => ({
  useDashboardConfig: () => ({
    config: [
      { widgetId: 'kpi-cards', visible: true },
      { widgetId: 'rec-completion', visible: true },
      { widgetId: 'audit-progress-pie', visible: true },
      { widgetId: 'risk-bar-chart', visible: true },
    ],
    updateConfig: vi.fn(),
    resetConfig: vi.fn(),
  }),
}));

vi.mock('../components/AuditWorkspaceHub', () => ({
  default: () => <div data-testid="audit-workspace-hub">Bàn làm việc Đoàn Kiểm toán Hub</div>,
}));

vi.mock('../components/ExecutiveGroupedDashboard', () => ({
  default: () => <div data-testid="executive-grouped-dashboard">Tổng quan Giám sát Điều hành Panel</div>,
}));

vi.mock('../../components/AiriskMap', () => ({
  default: () => <div data-testid="airisk-map" />,
}));

vi.mock('../../components/DashboardCustomizer', () => ({
  default: () => <div data-testid="dashboard-customizer" />,
}));

describe('Dashboard Page (DB-01 -> DB-06)', { timeout: 15000 }, () => {
  const mockStats = {
    activeEngagements: 8,
    highRiskFindings: 14,
    totalNd340Findings: 3,
    totalFineAmount: 150,
    totalRecs: 50,
    completedRecs: 35,
    inProgressRecs: 10,
    overdueRecs: 5,
    recCompletionRate: 70,
    wpPendingReview: 4,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/dashboard/stats')) {
        return Promise.resolve({ data: mockStats });
      }
      if (url.includes('/dashboard/audit-progress')) {
        return Promise.resolve({
          data: {
            chartData: [
              { name: 'Đang thực hiện', value: 5, color: '#1890ff' },
              { name: 'Hoàn thành', value: 12, color: '#52c41a' },
            ],
          },
        });
      }
      if (url.includes('/dashboard/risk-distribution')) {
        return Promise.resolve({
          data: {
            findingsByCategory: [
              { name: 'Tín dụng', High: 5, Medium: 10, Low: 2 },
            ],
            assessments: [],
          },
        });
      }
      if (url.includes('/reports/allowed')) {
        return Promise.resolve({
          data: [
            { id: 91, name: 'Báo cáo Tuân thủ Quy trình', chartType: 'bar', aggregateFunc: 'Số lượng' },
          ],
        });
      }
      if (url.includes('/execute')) {
        return Promise.resolve({
          data: [{ label: 'Đạt', value: 20 }, { label: 'Chưa đạt', value: 5 }],
        });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('DB-01: renders Dashboard header, floating need bar, and default Workspace Hub tab', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Dashboard Quản trị & Điều hành Kiểm toán Nội bộ/i)).toBeDefined();
      expect(screen.getByText(/Nhu cầu kiểm toán của bạn là/i)).toBeDefined();
      expect(screen.getByTestId('audit-workspace-hub')).toBeDefined();
    });
  });

  it('DB-02: switches to "Tổng quan Giám sát Điều hành" tab', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Tổng quan Giám sát Điều hành/i)).toBeDefined();
    });

    const execTab = screen.getByText(/Tổng quan Giám sát Điều hành/i);
    fireEvent.click(execTab);

    await waitFor(() => {
      expect(screen.getByTestId('executive-grouped-dashboard')).toBeDefined();
    });
  });

  it('DB-03: switches to "Chi nhánh & ĐVKD" tab and renders KPI stats', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('🏢 Chi nhánh & ĐVKD')).toBeDefined();
    });

    fireEvent.click(screen.getByText('🏢 Chi nhánh & ĐVKD'));

    await waitFor(() => {
      expect(screen.getByText(/Cuộc KT đang chạy/i)).toBeDefined();
      expect(screen.getByText(/Phát hiện RR Cao/i)).toBeDefined();
      expect(screen.getByText(/Kiến nghị Quá hạn/i)).toBeDefined();
    });
  });

  it('DB-04: navigates to target route when quick service shortcut is clicked', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Cuộc kiểm toán')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Cuộc kiểm toán'));
    expect(mockNavigate).toHaveBeenCalledWith('/audit-engagements');
  });

  it('DB-05: navigates when selecting need from dropdown and clicking "Tìm giải pháp"', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Tìm giải pháp')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Tìm giải pháp'));
    expect(mockNavigate).toHaveBeenCalledWith('/audit-engagements');
  });

  it('DB-06: renders dynamic reports section when custom reports exist', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('🏢 Chi nhánh & ĐVKD')).toBeDefined();
    });

    fireEvent.click(screen.getByText('🏢 Chi nhánh & ĐVKD'));

    await waitFor(() => {
      expect(screen.getByText('Báo cáo Động (Tùy chỉnh)')).toBeDefined();
      expect(screen.getByText('Báo cáo Tuân thủ Quy trình')).toBeDefined();
    });
  });
});
