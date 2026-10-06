import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AuditRatingView } from '../AuditRatingView';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('AuditRatingView Page (AR-01 -> AR-04)', { timeout: 15000 }, () => {
  const mockRatings = [
    {
      id: 1,
      ratingCode: 'RT-2026-001',
      engagementId: 'ENG-01',
      auditObjectId: 'CN_HN',
      engagementTitle: 'Kiểm toán Chi nhánh Hà Nội',
      auditType: 'Branch',
      coverageGapPct: 0.05,
      residualRiskScore: 2.1,
      controlEffectivenessScore: 2.0,
      criticalIssuesCount: 0,
      highIssuesCount: 1,
      moderateIssuesCount: 3,
      lowIssuesCount: 2,
      issueSeverityScore: 1.5,
      managementResponseScore: 1.2,
      scopeLimitation: 'None',
      baseWeightedScore: 82.5,
      calculatedRating: 'Generally Satisfactory',
      decisionRuleRating: 'Generally Satisfactory',
      decisionRuleRationale: 'Đạt chốt kiểm soát chính',
      finalRating: 'Generally Satisfactory',
      overallConclusion: 'Hệ thống kiểm soát nội bộ hoạt động hiệu quả tương đối.',
      status: 'Finalized',
    },
  ];

  const mockStats = {
    total: 1,
    satisfactory: 0,
    generallySatisfactory: 1,
    needsImprovement: 0,
    unsatisfactory: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/audit-ratings/stats')) {
        return Promise.resolve({ data: mockStats });
      }
      if (url.includes('/audit-ratings')) {
        return Promise.resolve({ data: mockRatings });
      }
      return Promise.resolve({ data: {} });
    });
    vi.mocked(api.post).mockResolvedValue({
      data: {
        baseWeightedScore: 85,
        calculatedRating: 'Satisfactory',
        decisionRuleRating: 'Satisfactory',
        finalRating: 'Satisfactory',
      },
    });
  });

  it('AR-01: fetches and renders audit ratings list and summary metrics', async () => {
    render(<AuditRatingView />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/audit-ratings', expect.anything());
      expect(api.get).toHaveBeenCalledWith('/audit-ratings/stats');
    });

    await waitFor(() => {
      expect(screen.getByText('Kiểm toán Chi nhánh Hà Nội')).toBeDefined();
      expect(screen.getByText('RT-2026-001')).toBeDefined();
    });
  });

  it('AR-02: filters ratings by tier dropdown or selection', async () => {
    render(<AuditRatingView />);

    await waitFor(() => {
      expect(screen.getByText('Kiểm toán Chi nhánh Hà Nội')).toBeDefined();
    });

    // The rating-tier filter is the select rendering the "-- Tất cả mức xếp hạng --" option
    const filterSelect = screen.getByDisplayValue('-- Tất cả mức xếp hạng --') as HTMLSelectElement;
    expect(filterSelect.tagName).toBe('SELECT');

    fireEvent.change(filterSelect, { target: { value: 'Generally Satisfactory' } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/audit-ratings', {
        params: { rating: 'Generally Satisfactory' },
      });
    });
  });

  it('AR-03: calculates preview score in rating simulator', async () => {
    render(<AuditRatingView />);

    await waitFor(() => {
      expect(screen.getByText('Kiểm toán Chi nhánh Hà Nội')).toBeDefined();
    });

    // The simulator has no "calculate" button: it auto-calls preview-calculate on mount
    // with the default simulator state.
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/audit-ratings/preview-calculate', {
        residualRiskScore: 2.2,
        controlEffectivenessScore: 2.0,
        criticalIssuesCount: 0,
        highIssuesCount: 1,
        moderateIssuesCount: 4,
        coverageGapPct: 0.05,
        managementResponseScore: 1.5,
        scopeLimitation: 'None',
      });
    });

    // The preview result card renders the API payload
    await waitFor(() => {
      expect(screen.getByText('Kết Quả Đánh Giá Tự Động')).toBeDefined();
    });
    const resultCard = screen.getByText('Kết Quả Đánh Giá Tự Động').closest('div.p-5') as HTMLElement;
    expect(resultCard).not.toBeNull();
    expect(resultCard.textContent).toContain('85');
    expect(resultCard.textContent).toContain('Satisfactory (Tốt)');
    expect(resultCard.textContent).toContain('100% Khớp Excel');

    // Moving the Residual Risk slider re-runs the calculation with the new input
    const residualRange = document.querySelector('input[type="range"]') as HTMLInputElement;
    expect(residualRange).not.toBeNull();
    fireEvent.change(residualRange, { target: { value: '3.5' } });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/audit-ratings/preview-calculate', {
        residualRiskScore: 3.5,
        controlEffectivenessScore: 2.0,
        criticalIssuesCount: 0,
        highIssuesCount: 1,
        moderateIssuesCount: 4,
        coverageGapPct: 0.05,
        managementResponseScore: 1.5,
        scopeLimitation: 'None',
      });
    });

    await waitFor(() => {
      expect(screen.getByText('3.5 / 4.0')).toBeDefined();
    });
  });

  it('AR-04: selects rating row and views detail panel', async () => {
    render(<AuditRatingView />);

    await waitFor(() => {
      expect(screen.getByText('Kiểm toán Chi nhánh Hà Nội')).toBeDefined();
    });

    const row = screen.getByText('Kiểm toán Chi nhánh Hà Nội');
    fireEvent.click(row);

    await waitFor(() => {
      expect(screen.getByText(/RT-2026-001/i)).toBeDefined();
    });

    // The rendered record row exposes the 5 weighted components + hard-rule rationale
    const recordRow = screen.getByText('RT-2026-001').closest('tr') as HTMLElement;
    expect(recordRow).not.toBeNull();
    expect(recordRow.textContent).toContain('CN_HN');
    expect(recordRow.textContent).toContain('2.1');
    expect(recordRow.textContent).toContain('82.5');
    expect(recordRow.textContent).toContain('Generally Satisfactory (Khá)');
    expect(recordRow.textContent).toContain('Đạt chốt kiểm soát chính');
  });
});
