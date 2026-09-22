import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { RecommendationTimeline } from '../RecommendationTimeline';
import api from '../../../services/api';

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('RecommendationTimeline Component (RTL-01 -> RTL-06)', () => {
  const baseRecommendation = {
    id: 901,
    title: 'Khắc phục lỗ hổng kiểm soát tiền mặt',
    recommendation: 'Trang bị két an toàn và thực hiện niêm phong cuối ngày',
    status: 'InProgress',
    closureStatus: 'PendingKTNBReview',
    progressPercent: 100,
    dueDate: '2026-12-31',
    assignedToId: 10,
    ktnbReviewerId: 10,
    ktnbReviewerName: 'Trần KTV',
    department: 'Phòng Ngân quỹ',
    remediationPlan: 'Đã mua két mới và phân công thủ quỹ bàn giao',
    response: 'Đã hoàn tất lắp đặt két và kiểm kê 100% tồn quỹ',
  };

  const mockAdminUser = {
    id: 1,
    userId: 1,
    role: 'admin',
    fullName: 'Lãnh đạo KTNB',
  };

  const mockKtvUser = {
    id: 10,
    userId: 10,
    role: 'auditor',
    fullName: 'Trần KTV',
  };

  const mockLeadUser = {
    id: 20,
    userId: 20,
    role: 'lead_auditor',
    fullName: 'Nguyễn Trưởng Đoàn',
  };

  const mockAuditeeUser = {
    id: 99,
    userId: 99,
    role: 'auditee',
    fullName: 'Lê Thủ Quỹ',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it('RTL-01: renders 5-step visual indicators and title correctly', () => {
    render(
      <RecommendationTimeline
        recommendation={baseRecommendation}
        currentUser={mockKtvUser}
      />
    );

    expect(screen.getByText(/Chu trình Khắc phục Kiến nghị/i)).toBeDefined();
    expect(screen.getByText(/1\. Ban hành/i)).toBeDefined();
    expect(screen.getByText(/2\. Kế hoạch/i)).toBeDefined();
    expect(screen.getByText(/3\. Báo cáo 100%/i)).toBeDefined();
    expect(screen.getByText(/4\. Thẩm tra KTV/i)).toBeDefined();
    expect(screen.getByText(/5\. Đóng hồ sơ/i)).toBeDefined();
  });

  it('RTL-02: Step 4 - KTV can open approval modal and submit ktnb-review', async () => {
    const onRefresh = vi.fn();
    (api.post as any).mockResolvedValue({ data: { success: true } });

    render(
      <RecommendationTimeline
        recommendation={baseRecommendation}
        currentUser={mockKtvUser}
        onRefresh={onRefresh}
      />
    );

    const approveBtn = screen.getByRole('button', { name: /Thẩm Định Đạt/i });
    expect(approveBtn).toBeDefined();

    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(screen.getByText(/Thẩm Định Bằng Chứng Khắc Phục/i)).toBeDefined();
    });

    const textArea = screen.getByPlaceholderText(/Nhập ghi chú thẩm định/i);
    fireEvent.change(textArea, {
      target: { value: 'Đã kiểm tra két tiền và niêm phong thực tế tại phòng quỹ, hồ sơ đạt yêu cầu.' },
    });

    const confirmBtn = screen.getByRole('button', { name: /Xác nhận đạt/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/recommendations/901/ktnb-review',
        expect.objectContaining({
          notes: expect.stringContaining('Đã kiểm tra két tiền'),
        })
      );
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it('RTL-03: Step 4 - KTV can open explanation modal and request additional evidence', async () => {
    const onRefresh = vi.fn();
    (api.post as any).mockResolvedValue({ data: { success: true } });

    render(
      <RecommendationTimeline
        recommendation={baseRecommendation}
        currentUser={mockKtvUser}
        onRefresh={onRefresh}
      />
    );

    const clarifyBtn = screen.getByRole('button', { name: /Yêu Cầu Giải Trình Thêm/i });
    expect(clarifyBtn).toBeDefined();

    fireEvent.click(clarifyBtn);

    await waitFor(() => {
      expect(screen.getByText(/Yêu Cầu ĐVĐKT Giải Trình Bổ Sung/i)).toBeDefined();
    });

    const textArea = screen.getByPlaceholderText(/Nêu rõ lý do từ chối/i);
    fireEvent.change(textArea, {
      target: { value: 'Cần bổ sung biên bản bàn giao chìa khóa két sắt' },
    });

    const submitBtn = screen.getByRole('button', { name: /Gửi yêu cầu/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/recommendations/901/progress',
        expect.objectContaining({
          progressPercent: 80,
          response: expect.stringContaining('Cần bổ sung'),
        })
      );
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it('RTL-04: Step 5a - Team Lead can open opinion modal and submit team-lead-opinion', async () => {
    const onRefresh = vi.fn();
    (api.post as any).mockResolvedValue({ data: { success: true } });

    const leadRec = {
      ...baseRecommendation,
      closureStatus: 'PendingTeamLeadOpinion',
    };

    render(
      <RecommendationTimeline
        recommendation={leadRec}
        currentUser={mockLeadUser}
        onRefresh={onRefresh}
      />
    );

    const opinionBtn = screen.getByRole('button', { name: /Ý Kiến Trưởng Đoàn/i });
    expect(opinionBtn).toBeDefined();

    fireEvent.click(opinionBtn);

    await waitFor(() => {
      expect(screen.getByText(/Ý Kiến Kết Luận Của Trưởng Đoàn/i)).toBeDefined();
    });

    const textArea = screen.getByPlaceholderText(/Nhập ý kiến kết luận của Trưởng đoàn/i);
    fireEvent.change(textArea, {
      target: { value: 'Đồng ý với kết quả kiểm tra của KTV, đề xuất CAE duyệt đóng.' },
    });

    const submitBtn = screen.getByRole('button', { name: /Lưu ý kiến/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/recommendations/901/team-lead-opinion',
        expect.objectContaining({
          opinion: expect.stringContaining('Đồng ý với kết quả kiểm tra'),
        })
      );
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it('RTL-05: Step 5b - CAE / Admin can approve final closure', async () => {
    const onRefresh = vi.fn();
    (api.post as any).mockResolvedValue({ data: { success: true } });

    const caeRec = {
      ...baseRecommendation,
      closureStatus: 'PendingTeamLeadOpinion',
      teamLeadClosureOpinion: 'Đồng thuận đóng',
    };

    render(
      <RecommendationTimeline
        recommendation={caeRec}
        currentUser={mockAdminUser}
        onRefresh={onRefresh}
      />
    );

    const closeBtn = screen.getByRole('button', { name: /Phê Duyệt Đóng/i });
    expect(closeBtn).toBeDefined();

    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined();
    });

    const textArea = screen.getByPlaceholderText(/Nhập lý do \/ căn cứ đóng/i);
    fireEvent.change(textArea, {
      target: { value: 'Phê duyệt đóng căn cứ theo kết quả thẩm định độc lập của đoàn kiểm toán.' },
    });

    const confirmBtn = screen.getByRole('button', { name: /Xác nhận đóng/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/recommendations/901/close',
        expect.objectContaining({
          closedReason: expect.stringContaining('Phê duyệt đóng'),
        })
      );
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it('RTL-06: Auditee action buttons trigger callbacks for Step 2 and Step 3', () => {
    const onOpenAuditeePlan = vi.fn();
    const onOpenAuditeeProgress = vi.fn();

    const notStartedRec = {
      ...baseRecommendation,
      status: 'NotStarted',
      closureStatus: 'Open',
      progressPercent: 0,
      remediationPlan: null,
    };

    const { rerender } = render(
      <RecommendationTimeline
        recommendation={notStartedRec}
        currentUser={mockAuditeeUser}
        onOpenAuditeePlan={onOpenAuditeePlan}
        onOpenAuditeeProgress={onOpenAuditeeProgress}
      />
    );

    // Step 2: Lập kế hoạch cam kết
    const planBtn = screen.getByRole('button', { name: /Lập Kế Hoạch Cam Kết/i });
    expect(planBtn).toBeDefined();
    fireEvent.click(planBtn);
    expect(onOpenAuditeePlan).toHaveBeenCalled();

    // Step 3: Báo cáo tiến độ
    const inProgressRec = {
      ...baseRecommendation,
      status: 'InProgress',
      closureStatus: 'Open',
      progressPercent: 60,
    };

    rerender(
      <RecommendationTimeline
        recommendation={inProgressRec}
        currentUser={mockAuditeeUser}
        onOpenAuditeePlan={onOpenAuditeePlan}
        onOpenAuditeeProgress={onOpenAuditeeProgress}
      />
    );

    const progressBtn = screen.getByRole('button', { name: /Báo Cáo Tiến Độ/i });
    expect(progressBtn).toBeDefined();
    fireEvent.click(progressBtn);
    expect(onOpenAuditeeProgress).toHaveBeenCalled();
  });
});
