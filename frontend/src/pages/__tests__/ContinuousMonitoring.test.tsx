import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ContinuousMonitoring from '../ContinuousMonitoring';
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

vi.mock('../components/CmcaExecutiveDashboard', () => ({
  default: () => <div data-testid="cmca-exec-dashboard">Executive Dashboard Mock</div>,
}));

vi.mock('../components/CamelsMetricDrilldownModal', () => ({
  default: ({ open }: { open: boolean }) => open ? <div data-testid="drilldown-modal">Drilldown Modal Mock</div> : null,
}));

vi.mock('../components/CmcaAuditCaseDrawer', () => ({
  default: () => <div data-testid="case-drawer">Case Drawer Mock</div>,
}));

vi.mock('../../components/BulkImport', () => ({
  default: () => <div data-testid="bulk-import-mock">BulkImport Mock</div>,
}));

vi.mock('../../components/KriDashboard', () => ({
  default: () => <div data-testid="kri-dashboard">KRI Dashboard Mock</div>,
}));

describe('ContinuousMonitoring Page (CM-01 -> CM-06)', { timeout: 15000 }, () => {
  const mockStats = { total: 45, open: 12, high: 5, red: 2, yellow: 10 };

  const mockCamels = [
    {
      id: 1,
      branchCode: 'CN_HANOI',
      carRatio: 12.5,
      cet1Ratio: 8.2,
      tier1Ratio: 9.1,
      nplRatio: 1.45,
      group2Ratio: 2.1,
      camelsRating: 'A',
      remediationOverdueDays: 0,
      roaRatio: 1.6,
      roeRatio: 18.2,
      ldrRatio: 78.5,
    },
    {
      id: 2,
      branchCode: 'CN_SAIGON',
      carRatio: 10.1,
      cet1Ratio: 6.8,
      tier1Ratio: 7.5,
      nplRatio: 3.2,
      group2Ratio: 4.8,
      camelsRating: 'C',
      remediationOverdueDays: 15,
      roaRatio: 0.9,
      roeRatio: 11.4,
      ldrRatio: 88.2,
    },
  ];

  const mockRules = [
    {
      id: 1,
      ruleCode: 'RULE_AQ_01',
      category: 'Asset Quality',
      metricName: 'Tỷ lệ nợ xấu (NPL)',
      description: 'Cảnh báo khi NPL vượt ngưỡng',
      operator: '>',
      yellowThreshold: 2.0,
      redThreshold: 3.0,
      yellowThresholdDisplay: '2.0%',
      redThresholdDisplay: '3.0%',
    },
  ];

  const mockAlerts = [
    {
      id: 1,
      title: 'Tỷ lệ NPL Chi nhánh Sài Gòn vượt ngưỡng Đỏ',
      severity: 'RED',
      branchCode: 'CN_SAIGON',
      status: 'OPEN',
      metricValue: 3.2,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/stats')) return Promise.resolve({ data: mockStats });
      if (url.includes('/camels-metrics')) return Promise.resolve({ data: mockCamels });
      if (url.includes('/kri-rules')) return Promise.resolve({ data: mockRules });
      if (url.includes('/alerts')) return Promise.resolve({ data: mockAlerts });
      if (url.includes('/audit-rules')) return Promise.resolve({ data: [] });
      if (url.includes('/audit-cases')) return Promise.resolve({ data: [] });
      if (url.includes('/audit-universe')) return Promise.resolve({ data: [] });
      if (url.includes('/departments')) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
  });

  it('CM-01: Renders CMCA title, scan button, and dashboard tabs', async () => {
    render(<ContinuousMonitoring />);

    expect(screen.getByText(/Giám sát & Kiểm toán Liên tục/i)).toBeDefined();
    expect(screen.getByText('Quét dữ liệu ngay')).toBeDefined();
    expect(screen.getByTestId('cmca-exec-dashboard')).toBeDefined();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/continuous-monitoring/alerts');
      expect(api.get).toHaveBeenCalledWith('/continuous-monitoring/stats');
    });
  });

  it('CM-02: Switches to "Ma trận CAMELS KRI" tab and renders metrics table', async () => {
    render(<ContinuousMonitoring />);

    const camelsTab = screen.getByText(/Ma trận CAMELS KRI/i);
    fireEvent.click(camelsTab);

    await waitFor(() => {
      expect(screen.getByText('CN_HANOI')).toBeDefined();
      expect(screen.getByText('CN_SAIGON')).toBeDefined();
      expect(screen.getByText('12.5%')).toBeDefined();
    });
  });

  it('CM-03: Triggers "Quét dữ liệu ngay" scan API when button clicked', async () => {
    (api.post as any).mockResolvedValueOnce({ data: { message: 'Quét thành công', scanned: 100 } });

    render(<ContinuousMonitoring />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/continuous-monitoring/alerts');
    });

    const scanBtn = screen.getByText('Quét dữ liệu ngay');
    fireEvent.click(scanBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/continuous-monitoring/run-scan');
    });
  });

  it('CM-04: Switches to "Cấu hình Tham số (CAMELS)" tab and displays rules list', async () => {
    render(<ContinuousMonitoring />);

    const rulesTab = screen.getByText(/Cấu hình Tham số/i);
    fireEvent.click(rulesTab);

    await waitFor(() => {
      expect(screen.getByText('RULE_AQ_01')).toBeDefined();
      expect(screen.getByText('Tỷ lệ nợ xấu (NPL)')).toBeDefined();
      expect(screen.getByText('2.0%')).toBeDefined();
      expect(screen.getByText('3.0%')).toBeDefined();
    });
  });

  it('CM-05: Opens Edit Threshold Modal for a KRI rule', async () => {
    render(<ContinuousMonitoring />);

    const rulesTab = screen.getByText(/Cấu hình Tham số/i);
    fireEvent.click(rulesTab);

    await waitFor(() => {
      expect(screen.getByText('RULE_AQ_01')).toBeDefined();
    });

    const editThresholdBtn = screen.getByText(/Sửa ngưỡng/i);
    fireEvent.click(editThresholdBtn);

    await waitFor(() => {
      expect(screen.getByText('Cấu hình tham số cảnh báo')).toBeDefined();
    });
  });

  it('CM-06: Searches alerts by keyword in header search input', async () => {
    render(<ContinuousMonitoring />);

    const searchInput = screen.getByPlaceholderText(/Tìm cảnh báo/i);
    fireEvent.change(searchInput, { target: { value: 'Sài Gòn' } });

    expect((searchInput as HTMLInputElement).value).toBe('Sài Gòn');
  });
});
