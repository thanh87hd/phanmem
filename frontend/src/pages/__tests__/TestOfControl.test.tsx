import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import TestOfControl from '../TestOfControl';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('TestOfControl Page (TC-01 -> TC-04)', { timeout: 15000 }, () => {
  const mockTocItems = [
    {
      id: 1,
      testId: 'TOC-2026-001',
      engagementId: 'ENG-01',
      auditObjectId: 'CN_HN',
      riskId: 'RSK-01',
      rcmId: 'RCM-CREDIT-01',
      controlId: 'CTL-01',
      controlDescription: 'Kiểm soát hạn mức giải ngân tín dụng',
      keyControl: 'Y',
      controlOwner: 'Phòng KHDN',
      controlFrequency: 'Daily',
      testPhase: 'Execution',
      testObjective: 'Kiểm tra 100% hồ sơ giải ngân vượt thẩm quyền',
      assertion: 'Accuracy',
      criteria: 'Quy chế tín dụng 2026',
      testMethod: 'Inspection',
      dataSource: 'Core Banking T24',
      populationDefinition: 'Tất cả các khoản vay Q1/2026',
      populationSize: 500,
      samplingMethod: 'Random',
      itemsTested: 50,
      validExceptions: 2,
      exceptionRate: 0.04,
      tolerableRate: 0.02,
      materialException: 'Y',
      suggestedResult: 'Fail',
      finalResult: 'Fail',
      exceptionSummary: 'Phát hiện 2 khoản vay vượt hạn mức phê duyệt',
      rootCauseAssessment: 'Thiếu kiểm soát tầng 2',
      riskImpactAssessment: 'Rủi ro tín dụng cao',
      issueRequired: 'Y',
      issueId: 'ISSUE-01',
      preparedBy: 'auditor1',
      testStatus: 'Completed',
      exceptions: [
        {
          id: 101,
          exceptionId: 'EXC-2026-001',
          testId: 'TOC-2026-001',
          sampleItemId: 'SMP-01',
          transactionDate: '2026-02-15',
          unitBranch: 'Chi nhánh Hà Nội',
          exceptionDescription: 'Khoản vay giải ngân vượt 10 tỷ không có phê duyệt HĐTD',
          criteriaBreached: 'Điều 15 Quy định cấp tín dụng',
          exceptionType: 'Exceeding Limit',
          financialExposure: 10000000000,
          customerImpact: 'High',
          regulatoryImpact: 'High',
          managementExplanation: 'Do lỗi nhập liệu',
          auditorValidation: 'Xác nhận sai sót',
          rootCauseCode: 'Process Defect',
          riskImpact: 'High',
          validException: 'Y',
          issueId: '',
          evidenceRef: 'DOC-001',
          reviewStatus: 'Confirmed',
        },
      ],
    },
  ];

  const mockStats = {
    totalTests: 1,
    passCount: 0,
    failCount: 1,
    passRate: 0,
    totalExceptions: 2,
    validExceptions: 2,
    totalFinancialExposure: 10000000000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/test-of-control/stats')) {
        return Promise.resolve({ data: mockStats });
      }
      if (url.includes('/test-of-control/TOC-2026-001')) {
        return Promise.resolve({ data: mockTocItems[0] });
      }
      if (url.includes('/test-of-control')) {
        return Promise.resolve({ data: { items: mockTocItems, total: 1 } });
      }
      return Promise.resolve({ data: {} });
    });
    vi.mocked(api.post).mockResolvedValue({
      data: { success: true, findingCode: 'FND-2026-001' },
    });
  });

  it('TC-01: fetches and renders test of control items and stats', async () => {
    render(<TestOfControl />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/test-of-control', expect.anything());
      expect(api.get).toHaveBeenCalledWith('/test-of-control/stats');
    });

    await waitFor(() => {
      expect(screen.getByText('TOC-2026-001')).toBeDefined();
      expect(screen.getByText('Kiểm soát hạn mức giải ngân tín dụng')).toBeDefined();
    });
  });

  it('TC-02: filters TOC items by search input', async () => {
    render(<TestOfControl />);

    await waitFor(() => {
      expect(screen.getByText('TOC-2026-001')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm theo mã Test/i);
    fireEvent.change(searchInput, { target: { value: 'TOC-2026' } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/test-of-control',
        expect.objectContaining({ params: expect.objectContaining({ search: 'TOC-2026' }) }),
      );
    });
  });

  it('TC-03: opens test detail drawer upon clicking view detail button', async () => {
    render(<TestOfControl />);

    await waitFor(() => {
      expect(screen.getByText('TOC-2026-001')).toBeDefined();
    });

    const detailBtn = screen.getByRole('button', { name: /Chi tiết/i });
    fireEvent.click(detailBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/test-of-control/TOC-2026-001');
      expect(screen.getByText('EXC-2026-001')).toBeDefined();
      expect(screen.getByText(/Khoản vay giải ngân vượt 10 tỷ/i)).toBeDefined();
    });
  });

  it('TC-04: triggers 1-click finding generation from control exception', async () => {
    render(<TestOfControl />);

    await waitFor(() => {
      expect(screen.getByText('TOC-2026-001')).toBeDefined();
    });

    const detailBtn = screen.getByRole('button', { name: /Chi tiết/i });
    fireEvent.click(detailBtn);

    await waitFor(() => {
      expect(screen.getByText('EXC-2026-001')).toBeDefined();
    });

    const generateBtn = screen.getByRole('button', { name: /Tạo phát hiện kiểm toán \(1-click\)/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/test-of-control/exceptions/EXC-2026-001/generate-finding',
      );
    });
  });
});
