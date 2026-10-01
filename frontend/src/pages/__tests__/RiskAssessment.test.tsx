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

  it('RA-01: renders page title and RBIA Line 3 Risk Engine header', async () => {
    render(<RiskAssessment />);

    await waitFor(() => {
      expect(screen.getByText(/Đánh giá Rủi ro Phục vụ Kế hoạch KTNB/i)).toBeDefined();
      expect(screen.getByText(/IIA GIAS 2024 & Thông tư 13\/2018\/TT-NHNN/i)).toBeDefined();
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

  it('RA-03: switches to "So sánh & Xu hướng Rủi ro" tab', async () => {
    render(<RiskAssessment />);

    await waitFor(() => {
      expect(screen.getByText(/So sánh & Xu hướng Rủi ro/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/So sánh & Xu hướng Rủi ro/i));

    await waitFor(() => {
      expect(screen.getByTestId('risk-comparison-tab')).toBeDefined();
    });
  });

  it('RA-04: switches to "Biến động ĐVKD & PGDBĐ" tab', async () => {
    render(<RiskAssessment />);

    await waitFor(() => {
      expect(screen.getByText(/Biến động ĐVKD & PGDBĐ/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/Biến động ĐVKD & PGDBĐ/i));

    await waitFor(() => {
      expect(screen.getByTestId('unit-restructuring-tab')).toBeDefined();
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

  it('RA-06: triggers data resync on mount', async () => {
    render(<RiskAssessment />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/risk-assessments');
    });
  });
});
