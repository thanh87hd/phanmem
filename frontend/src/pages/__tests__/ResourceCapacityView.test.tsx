import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ResourceCapacityView } from '../ResourceCapacityView';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ResourceCapacityView Page (RC-01 -> RC-04)', { timeout: 15000 }, () => {
  const mockStaff = [
    {
      id: 1,
      staffId: 'NV001',
      fullName: 'Nguyễn Văn Kiểm Toán',
      grade: 'Senior Auditor',
      department: 'Phòng KT Tín dụng',
      manager: 'Trưởng ban KTNB',
      fte: 1.0,
      primarySkill: 'Tín dụng',
      secondarySkills: 'Phân tích dữ liệu',
      skillLevel: 4,
      dataAnalyticsLevel: 3,
      certifications: 'CIA, CPA',
      annualStandardHours: 2000,
      netAvailableHours: 1600,
      committedHours: 1200,
      remainingCapacity: 400,
      utilizationPct: 75.0,
      skillGapFlag: 'None',
    },
  ];

  const mockQuarterly = [
    {
      quarter: 'Q3/2026',
      demandedHours: 4000,
      allocatedHours: 3600,
      availableCapacity: 4200,
      remainingHours: 600,
      utilization: 85.7,
      demandCount: 5,
    },
  ];

  const mockSkillGaps = [
    {
      skill: 'Công nghệ thông tin (IT Audit)',
      staffCount: 3,
      totalCapacityHours: 3600,
      totalDemandHours: 4200,
      netBalanceHours: -600,
      status: 'Deficit',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/quarterly-summary')) {
        return Promise.resolve({ data: mockQuarterly });
      }
      if (url.includes('/skill-gap')) {
        return Promise.resolve({ data: mockSkillGaps });
      }
      if (url.includes('/resource-capacity/staff')) {
        return Promise.resolve({ data: mockStaff });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('RC-01: fetches and renders staff roster with capacity metrics', async () => {
    render(<ResourceCapacityView />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/resource-capacity/staff', expect.anything());
    });

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn Kiểm Toán')).toBeDefined();
      expect(screen.getByText('NV001')).toBeDefined();
    });
  });

  it('RC-02: switches to Quarterly Summary tab and renders quarterly balance', async () => {
    render(<ResourceCapacityView />);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn Kiểm Toán')).toBeDefined();
    });

    const quarterTab = screen.getByRole('button', { name: /Cân Đối Cung - Cầu Q1-Q4/i });
    fireEvent.click(quarterTab);

    await waitFor(() => {
      expect(screen.getByText('Q3/2026')).toBeDefined();
      expect(screen.getByText(/4000h/i)).toBeDefined();
    });
  });

  it('RC-03: switches to Skill Gap analysis tab and renders matrix', async () => {
    render(<ResourceCapacityView />);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn Kiểm Toán')).toBeDefined();
    });

    const skillTab = screen.getByRole('button', { name: /Ma Trận Khoảng Trống Kỹ Năng/i });
    fireEvent.click(skillTab);

    await waitFor(() => {
      expect(screen.getByText('Công nghệ thông tin (IT Audit)')).toBeDefined();
      expect(screen.getByText('Deficit')).toBeDefined();
    });
  });

  it('RC-04: filters staff roster by primary skill selection', async () => {
    render(<ResourceCapacityView />);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn Kiểm Toán')).toBeDefined();
    });

    const select = document.querySelector('select');
    expect(select).toBeDefined();
    if (select) {
      fireEvent.change(select, { target: { value: 'Credit' } });
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          '/resource-capacity/staff',
          expect.objectContaining({ params: expect.objectContaining({ skill: 'Credit' }) }),
        );
      });
    }
  });
});
