import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AuditWorkspaceHub } from '../AuditWorkspaceHub';
import api from '../../../services/api';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../../utils/useCurrentUser', () => ({
  useCurrentUser: () => ({
    userId: 1,
    id: 1,
    fullName: 'KTV Datnc',
    username: 'datnc',
    role: 'Trưởng đoàn',
  }),
}));

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// timeout nâng lên 60s: panel "Việc cần xử lý" chỉ render sau 5 request song song
// nên 25s không đủ khi máy bận/CI 2 vCPU (đã quan sát timeout giả thực tế).
describe('AuditWorkspaceHub - Centralized My Action Items (TC-WB-02)', { timeout: 60000 }, () => {
  const mockEngagements = [
    {
      id: 1,
      name: 'Kiểm toán Tín dụng CN Hà Nội',
      status: 'Fieldwork',
      leadAuditorId: 1,
      teamMembers: [{ userId: 1, fullName: 'KTV Datnc' }],
    },
  ];

  const mockWps = [
    {
      id: 101,
      refCode: 'WP-01',
      title: 'Kiểm tra quy trình giải ngân hạn mức',
      status: 'Rework',
      assignedToId: 1,
      engagementId: 1,
      engagementName: 'Kiểm toán Tín dụng CN Hà Nội',
    },
    {
      id: 102,
      refCode: 'WP-02',
      title: 'Kiểm tra định giá tài sản đảm bảo',
      status: 'Submitted',
      engagementId: 1,
      engagementName: 'Kiểm toán Tín dụng CN Hà Nội',
    },
  ];

  const mockFindings = [
    {
      id: 201,
      code: 'FIND-001',
      findingTitle: 'Hồ sơ cấp tín dụng chưa đủ điều kiện pháp lý',
      status: 'Draft',
      auditorId: 1,
      riskLevel: 'High',
      engagementId: 1,
    },
  ];

  const mockRecs = [
    {
      id: 301,
      code: 'REC-001',
      recommendation: 'Đơn vị khắc phục hoàn thành 100% tài sản thiếu bảo hiểm',
      status: 'Completed',
      closureStatus: 'PendingKTNBReview',
      progressPercent: 100,
      assignedToId: 1,
      department: { name: 'CN Hà Nội' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/audit-engagements') return Promise.resolve({ data: mockEngagements });
      if (url === '/working-papers') return Promise.resolve({ data: mockWps });
      if (url === '/audit-tasks') return Promise.resolve({ data: [] });
      if (url.startsWith('/recommendations')) return Promise.resolve({ data: mockRecs });
      if (url === '/audit-findings') return Promise.resolve({ data: mockFindings });
      if (url.includes('/workstreams')) return Promise.resolve({ data: [] });
      if (url.includes('/documents')) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
  });

  it('renders My Action Items panel and handles all action workflows (TC-WB-02)', async () => {
    render(<AuditWorkspaceHub />);

    // 1. Wait for loading to finish and Action Items panel to appear
    await waitFor(() => {
      expect(screen.getByText(/VIỆC CẦN XỬ LÝ \(MY ACTION ITEMS\)/i)).toBeDefined();
    }, { timeout: 8000 });

    // 2. Verify all 4 tabs exist
    expect(screen.getAllByText(/Giấy tờ W\/P/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Phát hiện kiểm toán/i)).toBeDefined();
    expect(screen.getByText(/Kiến nghị chờ nghiệm thu/i)).toBeDefined();
    expect(screen.getByText(/Phân hành đến hạn/i)).toBeDefined();

    // 3. Verify action button for W/P
    const wpActionBtns = screen.getAllByRole('button', { name: /Xử lý W\/P ⚡/i });
    expect(wpActionBtns.length).toBeGreaterThan(0);
    fireEvent.click(wpActionBtns[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/working-papers');

    // 4. Switch to Recommendations Tab and verify action button
    const recsTab = screen.getByText(/Kiến nghị chờ nghiệm thu/i);
    fireEvent.click(recsTab);

    await waitFor(() => {
      const verifyBtns = screen.getAllByRole('button', { name: /Nghiệm thu đóng 📋/i });
      expect(verifyBtns.length).toBeGreaterThan(0);
      fireEvent.click(verifyBtns[0]);
    }, { timeout: 8000 });

    expect(mockNavigate).toHaveBeenCalledWith('/recommendations', {
      state: { closureStatus: 'PendingKTNBReview' },
    });
  });
});
