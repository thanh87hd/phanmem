import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RaciGovernanceView } from '../RaciGovernanceView';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('RaciGovernanceView Page (RG-01 -> RG-04)', { timeout: 15000 }, () => {
  const mockProcesses = [
    {
      id: 1,
      processId: 'PROC-CREDIT-01',
      processName: 'Quy trình Cấp tín dụng Doanh nghiệp vừa và nhỏ',
      processType: 'Credit',
      objective: 'Đảm bảo tuân thủ thẩm định và giải ngân',
      scope: 'Toàn hệ thống',
      processOwner: 'Khối KHDN',
      executiveOwner: 'Phó Tổng Giám đốc',
      criticality: 'High',
      version: '2.1',
    },
    {
      id: 2,
      processId: 'PROC-IT-01',
      processName: 'Quy trình Quản lý truy cập đặc quyền PAM',
      processType: 'IT',
      objective: 'Kiểm soát truy cập máy chủ trọng yếu',
      scope: 'Toàn hàng',
      processOwner: 'Khối CNTT',
      executiveOwner: 'Giám đốc CNTT',
      criticality: 'Critical',
      version: '1.0',
    },
  ];

  const mockMatrix = {
    process: mockProcesses[0],
    roles: [
      { roleId: 'RM', roleName: 'Quan hệ khách hàng' },
      { roleId: 'CA', roleName: 'Thẩm định tín dụng' },
      { roleId: 'APPROVER', roleName: 'Cấp phê duyệt' },
    ],
    matrix: [
      {
        activityId: 'ACT-01',
        stepNo: 1,
        activityName: 'Tiếp nhận hồ sơ vay',
        activityType: 'Operational',
        decisionAuthority: 'RM',
        sla: '24h',
        assignments: { RM: 'R', CA: 'C', APPROVER: 'I' },
      },
      {
        activityId: 'ACT-02',
        stepNo: 2,
        activityName: 'Thẩm định độc lập rủi ro tín dụng',
        activityType: 'Control',
        decisionAuthority: 'CA',
        sla: '48h',
        assignments: { RM: 'C', CA: 'R', APPROVER: 'A' },
      },
    ],
  };

  const mockQaResult = {
    processId: 'PROC-CREDIT-01',
    totalActivities: 2,
    compliantCount: 2,
    complianceRate: 100,
    violationsCount: 0,
    violations: [],
    status: 'Compliant',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/matrix')) {
        return Promise.resolve({ data: mockMatrix });
      }
      if (url.includes('/qa-checks')) {
        return Promise.resolve({ data: mockQaResult });
      }
      if (url.includes('/raci-governance/processes')) {
        return Promise.resolve({ data: mockProcesses });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('RG-01: fetches and renders governance processes list and process details', async () => {
    render(<RaciGovernanceView />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/raci-governance/processes');
    });

    await waitFor(() => {
      expect(screen.getByText(/Quy trình & Ma Trận Phân Công RACI/i)).toBeDefined();
      expect(screen.getAllByText(/Quy trình Cấp tín dụng/i).length).toBeGreaterThan(0);
    });
  });

  it('RG-02: renders RACI matrix activities and assigned roles', async () => {
    render(<RaciGovernanceView />);

    await waitFor(() => {
      expect(screen.getByText(/Tiếp nhận hồ sơ vay/i)).toBeDefined();
      expect(screen.getByText(/Thẩm định độc lập rủi ro tín dụng/i)).toBeDefined();
      expect(screen.getByText('Quan hệ khách hàng')).toBeDefined();
    });
  });

  it('RG-03: renders RACI QA check compliance rate and compliant count', async () => {
    render(<RaciGovernanceView />);

    await waitFor(() => {
      expect(screen.getByText(/100% Tuân Thủ/i)).toBeDefined();
      expect(screen.getByText(/2 \/ 2 hoạt động đạt chuẩn/i)).toBeDefined();
    });
  });

  it('RG-04: switches process via dropdown selection and fetches details', async () => {
    render(<RaciGovernanceView />);

    await waitFor(() => {
      expect(screen.getByText(/Tiếp nhận hồ sơ vay/i)).toBeDefined();
    });

    const select = document.querySelector('select');
    expect(select).toBeDefined();
    if (select) {
      fireEvent.change(select, { target: { value: 'PROC-IT-01' } });
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/raci-governance/processes/PROC-IT-01/matrix');
        expect(api.get).toHaveBeenCalledWith('/raci-governance/processes/PROC-IT-01/qa-checks');
      });
    }
  });
});
