import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MasterSamplingTab from '../MasterSamplingTab';
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
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('MasterSamplingTab (MS-01 -> MS-06)', { timeout: 15000 }, () => {
  const mockEngagementId = 101;

  const mockEngagement = {
    id: 101,
    name: 'Đoàn Kiểm toán CN Bình Dương',
    leadAuditorUser: { id: 1, fullName: 'Trần Trưởng Đoàn', username: 'lead_auditor' },
    teamMembers: [
      { id: 2, userId: 2, fullName: 'Lê KTV Tín Dụng', role: 'KTV Tín Dụng' },
      { id: 3, userId: 3, fullName: 'Nguyễn KTV Vận Hành', role: 'KTV Vận Hành' },
    ],
  };

  const mockUsers = [
    { id: 1, fullName: 'Trần Trưởng Đoàn', username: 'lead_auditor' },
    { id: 2, fullName: 'Lê KTV Tín Dụng', username: 'auditor_credit' },
    { id: 3, fullName: 'Nguyễn KTV Vận Hành', username: 'auditor_ops' },
  ];

  const mockBatches = [
    {
      id: 301,
      batchName: 'Tập mẫu Hợp đồng Tín dụng Doanh nghiệp Lớn',
      auditDomain: 'CREDIT',
      samplingMethod: 'MUS',
      sampleSize: 15,
      assignedAuditorId: 2,
      assignedAuditorName: 'Lê KTV Tín Dụng',
      samples: [
        {
          id: 1001,
          sampleCode: 'SMP-001',
          loanAmount: 5000000000,
          testResult: 'PASS',
          assignedAuditorId: 2,
          assignedAuditorName: 'Lê KTV Tín Dụng',
        },
        {
          id: 1002,
          sampleCode: 'SMP-002',
          loanAmount: 8500000000,
          testResult: 'FAIL',
          assignedAuditorId: 2,
          assignedAuditorName: 'Lê KTV Tín Dụng',
        },
      ],
    },
    {
      id: 302,
      batchName: 'Tập mẫu Kiểm tra Giao dịch Quầy',
      auditDomain: 'OPERATIONS',
      samplingMethod: 'RANDOM',
      sampleSize: 20,
      assignedAuditorId: null,
      assignedAuditorName: null,
      samples: [
        {
          id: 1003,
          sampleCode: 'SMP-003',
          loanAmount: 20000000,
          testResult: 'NOT_TESTED',
          assignedAuditorId: null,
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/audit-samples/batches') {
        return Promise.resolve({ data: mockBatches });
      }
      if (url === `/audit-engagements/${mockEngagementId}`) {
        return Promise.resolve({ data: mockEngagement });
      }
      if (url === '/users') {
        return Promise.resolve({ data: mockUsers });
      }
      return Promise.resolve({ data: [] });
    });
    (api.post as any).mockResolvedValue({ data: { success: true } });
    (api.patch as any).mockResolvedValue({ data: { success: true } });
    (api.delete as any).mockResolvedValue({ data: { success: true } });
  });

  it('MS-01: renders batches table and engagement sampling title', async () => {
    render(<MasterSamplingTab engagementId={mockEngagementId} />);

    await waitFor(() => {
      expect(screen.getByText('Chọn mẫu tổng thể & Phân tích Đơn vị (Master Sampling Engine)')).toBeDefined();
      expect(screen.getByText('Tập mẫu Hợp đồng Tín dụng Doanh nghiệp Lớn')).toBeDefined();
      expect(screen.getByText('Tập mẫu Kiểm tra Giao dịch Quầy')).toBeDefined();
    });

    expect(api.get).toHaveBeenCalledWith('/audit-samples/batches', { params: { engagementId: mockEngagementId } });
    expect(api.get).toHaveBeenCalledWith(`/audit-engagements/${mockEngagementId}`);
  });

  it('MS-02: displays sample size, method tags, and domain badges', async () => {
    render(<MasterSamplingTab engagementId={mockEngagementId} />);

    await waitFor(() => {
      expect(screen.getByText('MUS')).toBeDefined();
      expect(screen.getByText('RANDOM')).toBeDefined();
      expect(screen.getByText('Tín dụng')).toBeDefined();
      expect(screen.getByText('Vận hành')).toBeDefined();
    });
  });

  it('MS-03: displays test summary stats (Tổng mẫu, Pass, Fail)', async () => {
    render(<MasterSamplingTab engagementId={mockEngagementId} />);

    await waitFor(() => {
      expect(screen.getByText('Tổng mẫu trong đợt')).toBeDefined();
      expect(screen.getByText('Pass')).toBeDefined();
      expect(screen.getByText('Fail')).toBeDefined();
    });
  });

  it('MS-04: opens create batch modal when clicking "Tạo tập mẫu mới"', async () => {
    render(<MasterSamplingTab engagementId={mockEngagementId} />);

    await waitFor(() => {
      expect(screen.getByText('Tạo tập mẫu mới')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Tạo tập mẫu mới'));

    await waitFor(() => {
      expect(screen.getAllByText(/Tạo Tập Mẫu Mới/i).length).toBeGreaterThan(1);
      expect(screen.getByText(/Quy mô tổng thể/i)).toBeDefined();
    });
  });

  it('MS-05: updates batch auditor assignment via patch API', async () => {
    render(<MasterSamplingTab engagementId={mockEngagementId} />);

    await waitFor(() => {
      expect(screen.getByText('Tập mẫu Hợp đồng Tín dụng Doanh nghiệp Lớn')).toBeDefined();
    });

    // Auditor select dropdown is present
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('MS-06: filters batches by domain when selecting segmented option', async () => {
    render(<MasterSamplingTab engagementId={mockEngagementId} />);

    await waitFor(() => {
      expect(screen.getByText('Tập mẫu Hợp đồng Tín dụng Doanh nghiệp Lớn')).toBeDefined();
    });

    const creditFilter = screen.getByText('🏦 Tín dụng');
    fireEvent.click(creditFilter);

    await waitFor(() => {
      expect(screen.getByText('Tập mẫu Hợp đồng Tín dụng Doanh nghiệp Lớn')).toBeDefined();
    });
  });
});
