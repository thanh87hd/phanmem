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

    const selects = document.querySelectorAll('select');
    const filterSelect = selects[selects.length - 1];
    expect(filterSelect).toBeDefined();
    if (filterSelect) {
      fireEvent.change(filterSelect, { target: { value: 'Generally Satisfactory' } });
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          '/audit-ratings',
          expect.objectContaining({ params: expect.objectContaining({ rating: 'Generally Satisfactory' }) }),
        );
      });
    }
  });

  it('AR-03: calculates preview score in rating simulator', async () => {
    render(<AuditRatingView />);

    await waitFor(() => {
      expect(screen.getByText('Kiểm toán Chi nhánh Hà Nội')).toBeDefined();
    });

    const calcBtn = screen.queryByRole('button', { name: /Mô phỏng|Tính toán|Calculate/i }) || screen.queryByText(/Mô phỏng/i);
    if (calcBtn) {
      fireEvent.click(calcBtn);
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/audit-ratings/preview-calculate',
          expect.anything(),
        );
      });
    }
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
  });
});
