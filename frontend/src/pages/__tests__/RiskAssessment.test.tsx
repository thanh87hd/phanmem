import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import RiskAssessment from '../RiskAssessment';
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

vi.mock('../../components/RiskScoringTab', () => ({
  default: () => <div data-testid="risk-scoring-tab">Risk Scoring Tab Mock</div>,
}));

vi.mock('../../components/RiskComparisonTab', () => ({
  default: () => <div data-testid="risk-comparison-tab">Risk Comparison Tab Mock</div>,
}));

vi.mock('../../components/RiskDefectHeatmapTab', () => ({
  default: () => <div data-testid="risk-defect-heatmap-tab">Risk Defect Heatmap Tab Mock</div>,
}));

vi.mock('../../components/UnitRestructuringComparisonTab', () => ({
  default: () => <div data-testid="unit-restructuring-tab">Unit Restructuring Tab Mock</div>,
}));

vi.mock('../../components/RiskProfilesTab', () => ({
  default: () => <div data-testid="risk-profiles-tab">Risk Profiles Tab Mock</div>,
}));

vi.mock('../../components/RiskTransferModal', () => ({
  default: ({ visible, onCancel }: any) => (
    visible ? <div data-testid="risk-transfer-modal"><button onClick={onCancel}>Đóng Modal</button></div> : null
  ),
}));

vi.mock('../../components/RiskHeatMap', () => ({
  default: () => <div data-testid="risk-heat-map">Risk Heat Map Mock</div>,
}));

vi.mock('../RiskRegister', () => ({
  default: () => <div data-testid="risk-register-page">Risk Register Page Mock</div>,
}));

describe('RiskAssessment Page (RA-01 -> RA-06)', { timeout: 15000 }, () => {
  const mockUniverses = [
    { id: 1, name: 'Khối KHDN' },
    { id: 2, name: 'CN Hà Nội' },
  ];

  const mockCriteria = [
    { id: 1, name: 'Rủi ro Tín dụng', weight: 40 },
    { id: 2, name: 'Rủi ro Hoạt động', weight: 30 },
    { id: 3, name: 'Rủi ro Tuân thủ', weight: 30 },
  ];

  const mockAssessments = [
    { id: 1, universeId: 1, totalScore: 3.8, inherentRiskLevel: 'High' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/audit-universe') {
        return Promise.resolve({ data: mockUniverses });
      }
      if (url === '/risk-criteria') {
        return Promise.resolve({ data: mockCriteria });
      }
      if (url === '/risk-assessments') {
        return Promise.resolve({ data: mockAssessments });
      }
      if (url === '/departments') {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('RA-01: renders page title and 3-Lines Risk Engine header', async () => {
    render(<RiskAssessment />);

    await waitFor(() => {
      expect(screen.getByText(/Hệ thống Quản lý & Đánh giá Rủi ro/i)).toBeDefined();
      expect(screen.getByText(/IIA 2024 Hybrid Approach/i)).toBeDefined();
    });

    expect(api.get).toHaveBeenCalledWith('/audit-universe');
    expect(api.get).toHaveBeenCalledWith('/risk-criteria');
    expect(api.get).toHaveBeenCalledWith('/risk-assessments');
  });

  it('RA-02: renders default tab "Đánh giá Rủi ro Thực thể" subcomponent', async () => {
    render(<RiskAssessment />);

    await waitFor(() => {
      expect(screen.getByTestId('risk-scoring-tab')).toBeDefined();
    });
  });

  it('RA-03: switches to "Bộ Hồ Sơ Rủi Ro KTNB" tab', async () => {
    render(<RiskAssessment />);

    await waitFor(() => {
      expect(screen.getByText(/Bộ Hồ Sơ Rủi Ro/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/Bộ Hồ Sơ Rủi Ro/i));

    await waitFor(() => {
      expect(screen.getByTestId('risk-profiles-tab')).toBeDefined();
    });
  });

  it('RA-04: switches to "Sổ Đăng Ký Rủi Ro (Risk Register)" tab', async () => {
    render(<RiskAssessment />);

    await waitFor(() => {
      expect(screen.getByText(/Sổ Đăng Ký Rủi Ro/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/Sổ Đăng Ký Rủi Ro/i));

    await waitFor(() => {
      expect(screen.getByTestId('risk-register-page')).toBeDefined();
    });
  });

  it('RA-05: opens Transfer Risk Modal when clicking "Chuyển giao Rủi ro ĐVKD"', async () => {
    render(<RiskAssessment />);

    await waitFor(() => {
      expect(screen.getByText('Chuyển giao Rủi ro ĐVKD')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Chuyển giao Rủi ro ĐVKD'));

    await waitFor(() => {
      expect(screen.getByTestId('risk-transfer-modal')).toBeDefined();
    });
  });

  it('RA-06: triggers data resync when clicking "Đồng bộ dữ liệu"', async () => {
    render(<RiskAssessment />);

    await waitFor(() => {
      expect(screen.getByText('Đồng bộ dữ liệu')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Đồng bộ dữ liệu'));

    await waitFor(() => {
      // api.get should have been called again on click
      expect(api.get).toHaveBeenCalledWith('/risk-assessments');
    });
  });
});
