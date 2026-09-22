import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ScenarioRiskMap } from '../ScenarioRiskMap';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ScenarioRiskMap Page (SR-01 -> SR-04)', { timeout: 15000 }, () => {
  const mockScenarios = [
    {
      id: 1,
      scenarioId: 'SCN-BASE',
      scenarioName: 'Kịch bản Cơ sở 2026',
      scenarioType: 'Baseline',
      horizon: '12 tháng',
      description: 'Điều kiện kinh tế vĩ mô ổn định, tăng trưởng tín dụng 14%',
      keyAssumptions: 'Lãi suất điều hành ổn định, nợ xấu dưới 2.5%',
      triggerIndicators: 'Tăng trưởng GDP > 6.5%',
      probabilityPct: 0.6,
      severity: 2,
      affectedDomains: 'Tín dụng, Nguồn vốn',
      scenarioOwner: 'Ban QTRR',
    },
    {
      id: 2,
      scenarioId: 'SCN-STRESS-01',
      scenarioName: 'Căng thẳng Thanh khoản & Lãi suất',
      scenarioType: 'Stress',
      horizon: '6 tháng',
      description: 'Thanh khoản thắt chặt, lãi suất liên ngân hàng tăng 200 điểm cơ bản',
      keyAssumptions: 'Rút tiền gửi quy mô lớn',
      triggerIndicators: 'LDR > 85%',
      probabilityPct: 0.25,
      severity: 4,
      affectedDomains: 'Nguồn vốn, Thị trường',
      scenarioOwner: 'Ban QTRR',
    },
  ];

  const mockRiskMapBase = {
    scenario: mockScenarios[0],
    statistics: {
      totalRisks: 1,
      aboveAppetiteCount: 0,
      criticalCount: 0,
      highCount: 0,
      breachRate: 0,
    },
    points: [
      {
        id: 'p1',
        riskId: 'RSK-CREDIT-01',
        riskName: 'Rủi ro nợ xấu bán lẻ gia tăng',
        riskDomain: 'Tín dụng Bán lẻ',
        materialityExposure: 25000000000,
        baseX: 3,
        baseY: 3,
        baseScore: 9,
        x: 3,
        y: 3,
        score: 9,
        delta: 0,
        trajectory: 'Stable',
        isAboveAppetite: false,
        band: 'Medium',
        response: 'Giám sát định kỳ',
        impactOnPlan: 'Duy trì kế hoạch kiểm toán hiện hành',
      },
    ],
  };

  const mockRiskMapStress = {
    scenario: mockScenarios[1],
    statistics: {
      totalRisks: 1,
      aboveAppetiteCount: 1,
      criticalCount: 1,
      highCount: 1,
      breachRate: 100,
    },
    points: [
      {
        id: 'p1',
        riskId: 'RSK-CREDIT-01',
        riskName: 'Rủi ro nợ xấu bán lẻ gia tăng',
        riskDomain: 'Tín dụng Bán lẻ',
        materialityExposure: 50000000000,
        baseX: 3,
        baseY: 3,
        baseScore: 9,
        x: 4,
        y: 4,
        score: 16,
        delta: 7,
        trajectory: 'Deteriorating',
        isAboveAppetite: true,
        band: 'High',
        response: 'Kiểm toán đột xuất',
        impactOnPlan: 'Ưu tiên đưa vào kế hoạch kiểm toán Q2/2026',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/scenario-analysis/scenarios')) {
        return Promise.resolve({ data: mockScenarios });
      }
      if (url.includes('SCN-STRESS-01')) {
        return Promise.resolve({ data: mockRiskMapStress });
      }
      if (url.includes('/scenario-analysis/risk-map')) {
        return Promise.resolve({ data: mockRiskMapBase });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('SR-01: fetches and renders scenarios and baseline risk map', async () => {
    render(<ScenarioRiskMap />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/scenario-analysis/scenarios');
      expect(api.get).toHaveBeenCalledWith('/scenario-analysis/risk-map/SCN-BASE');
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Kịch bản Cơ sở 2026/i).length).toBeGreaterThan(0);
      expect(screen.getByText('RSK-CREDIT-01')).toBeDefined();
      expect(screen.getByText('Rủi ro nợ xấu bán lẻ gia tăng')).toBeDefined();
    });
  });

  it('SR-02: switches to stress scenario via scenario pill button', async () => {
    render(<ScenarioRiskMap />);

    await waitFor(() => {
      expect(screen.getByText('RSK-CREDIT-01')).toBeDefined();
    });

    const stressPill = screen.getByText(/Căng thẳng Thanh khoản & Lãi suất/i);
    fireEvent.click(stressPill);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/scenario-analysis/risk-map/SCN-STRESS-01');
      expect(screen.getByText(/Tỷ lệ vi phạm: 100%/i)).toBeDefined();
    });
  });

  it('SR-03: selects risk point row to inspect details and plan impact', async () => {
    render(<ScenarioRiskMap />);

    await waitFor(() => {
      expect(screen.getByText('RSK-CREDIT-01')).toBeDefined();
    });

    const riskRow = screen.getByText('Rủi ro nợ xấu bán lẻ gia tăng');
    fireEvent.click(riskRow);

    await waitFor(() => {
      expect(screen.getByText(/Tác động kế hoạch kiểm toán năm:/i)).toBeDefined();
      expect(screen.getByText('Duy trì kế hoạch kiểm toán hiện hành')).toBeDefined();
    });
  });

  it('SR-04: verifies appetite threshold status in stress scenario', async () => {
    render(<ScenarioRiskMap />);

    await waitFor(() => {
      expect(screen.getByText('RSK-CREDIT-01')).toBeDefined();
    });

    const stressPill = screen.getByText(/Căng thẳng Thanh khoản & Lãi suất/i);
    fireEvent.click(stressPill);

    await waitFor(() => {
      expect(screen.getByText(/Vượt ngưỡng/i)).toBeDefined();
      expect(screen.getByText(/Kiểm toán đột xuất/i)).toBeDefined();
    });
  });
});
