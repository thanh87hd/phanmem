import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ThematicAnalysis from '../ThematicAnalysis';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ThematicAnalysis Page (TA-01 -> TA-04)', { timeout: 15000 }, () => {
  const mockThemes = [
    {
      id: 1,
      themeId: 'TH-2026-001',
      themeTitle: 'Rủi ro An ninh mạng và Bảo vệ Dữ liệu Khách hàng',
      riskDomainCode: 'CNTT',
      analysisPeriod: '2025-2026',
      riskTrajectory: 'Increasing',
      themePriority: 'High',
      financialExposureEst: 15000000000,
      systemicImpactSummary: 'Ảnh hưởng bảo mật hệ thống ngân hàng số',
      systemicRootCause: 'Thiếu cập nhật bản vá bảo mật định kỳ',
      assuranceGap: 'Chưa kiểm toán chuyên sâu mã nguồn API',
      recommendedResponse: 'Kiểm toán đột xuất hệ thống định danh eKYC',
      status: 'Active',
      linkedFindingsCount: 3,
      issueIds: ['ISSUE-01', 'ISSUE-02'],
      riskIds: ['RSK-CYBER-01'],
    },
  ];

  const mockDashboard = {
    totalThemes: 1,
    highPriorityThemes: 1,
    activeThemes: 1,
    totalLinkedFindings: 3,
    domainDistribution: [{ domain: 'CNTT', count: 1 }],
  };

  const mockAutoDetect = {
    totalSystemicFindings: 5,
    clusters: [
      {
        clusterName: 'Cụm Rủi ro CNTT & API bảo mật',
        proposedDomain: 'CNTT',
        findingCount: 2,
        suggestedTitle: 'Kiểm toán tích hợp API mở Core Banking',
        riskTrajectory: 'Increasing',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/thematic-themes/dashboard')) {
        return Promise.resolve({ data: mockDashboard });
      }
      if (url.includes('/thematic-themes/auto-detect')) {
        return Promise.resolve({ data: mockAutoDetect });
      }
      if (url.includes('/thematic-themes')) {
        return Promise.resolve({ data: mockThemes });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('TA-01: fetches and renders thematic risk registry and dashboard summary', async () => {
    render(<ThematicAnalysis />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/thematic-themes', expect.anything());
      expect(api.get).toHaveBeenCalledWith('/thematic-themes/dashboard');
    });

    await waitFor(() => {
      expect(screen.getByText('TH-2026-001')).toBeDefined();
      expect(screen.getByText('Rủi ro An ninh mạng và Bảo vệ Dữ liệu Khách hàng')).toBeDefined();
    });
  });

  it('TA-02: filters themes by search input keyword', async () => {
    render(<ThematicAnalysis />);

    await waitFor(() => {
      expect(screen.getByText('TH-2026-001')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Tìm theo Mã, Tên chuyên đề hoặc Nguyên nhân/i);
    fireEvent.change(searchInput, { target: { value: 'An ninh mạng' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/thematic-themes',
        expect.objectContaining({ params: expect.objectContaining({ search: 'An ninh mạng' }) }),
      );
    });
  });

  it('TA-03: opens theme create modal with form fields upon clicking add theme button', async () => {
    render(<ThematicAnalysis />);

    await waitFor(() => {
      expect(screen.getByText('TH-2026-001')).toBeDefined();
    });

    const addBtn = screen.getByRole('button', { name: /\+ Thêm mới Chuyên đề/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText(/Thêm mới Chuyên đề Rủi ro Hệ thống/i)).toBeDefined();
      expect(screen.getByText(/Mã chuyên đề \(Theme ID\)/i)).toBeDefined();
    });
  });

  it('TA-04: switches to Auto-Detect tab and renders detected clusters', async () => {
    render(<ThematicAnalysis />);

    await waitFor(() => {
      expect(screen.getByText('TH-2026-001')).toBeDefined();
    });

    const autoTab = document.querySelector('.ant-tabs-tab[data-node-key="autodetect"] .ant-tabs-tab-btn') || screen.getByText(/Công cụ Nhận diện Cụm Rủi ro Tự động/i);
    expect(autoTab).toBeDefined();
    if (autoTab) {
      fireEvent.click(autoTab);
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/thematic-themes/auto-detect');
        expect(screen.getByText(/Kiểm toán tích hợp API mở Core Banking/i)).toBeDefined();
      });
    }
  });
});
