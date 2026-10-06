import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RecommendationsService } from './recommendations.service';
import { Recommendation } from './entities/recommendation.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('RecommendationsService', () => {
  let service: RecommendationsService;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  /** Tra cứu người nhận BKS/CAE cho cảnh báo Level 3 (BUG 2). */
  const mockUserRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockRecommendationRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((rec) => Promise.resolve({ id: 1, ...rec })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    manager: {
      getRepository: jest.fn(() => mockUserRepo),
    },
  };

  const mockFindingRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  };

  const mockNotificationsService = {
    create: jest.fn().mockResolvedValue({ id: 1 }),
  };

  const mockMailService = {
    sendOverdueWarning: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    // jest.clearAllMocks() không xoá implementation đã set trong test trước đó.
    mockUserRepo.find.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        {
          provide: getRepositoryToken(Recommendation),
          useValue: mockRecommendationRepo,
        },
        {
          provide: getRepositoryToken(AuditFinding),
          useValue: mockFindingRepo,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a new recommendation assigning user ID if not provided', async () => {
      const dto = {
        recommendation: 'Fix process defects',
        findingId: 10,
        legacyDepartment: 'Operations',
      };
      const user = { userId: 5, role: 'KTV' };

      const result = await service.create(dto as any, user);
      expect(mockRecommendationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ assignedToId: 5 }),
      );
      expect(mockRecommendationRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 1);
    });
  });

  describe('findAll', () => {
    it('should query without department restriction for Admin role', async () => {
      const user = { userId: 1, role: 'Admin' };
      await service.findAll(user, { slaStatus: 'ChuaDenHan' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'rec.slaStatus = :slaStatus',
        { slaStatus: 'ChuaDenHan' },
      );
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });

    it('should apply department restriction for Auditee role', async () => {
      const user = {
        userId: 99,
        role: 'Auditee',
        legacyDepartment: 'Chi nhánh Hà Nội',
      };
      await service.findAll(user);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(rec.legacyDepartment = :dept OR rec.auditeeOwnerId = :userId)',
        { dept: 'Chi nhánh Hà Nội', userId: 99 },
      );
    });
  });

  describe('submitRemediationPlan', () => {
    it('should update plan and send notification to assigned auditor', async () => {
      const mockRec = {
        id: 1,
        recommendation: 'Nâng cấp bảo mật máy chủ',
        assignedToId: 4,
      };
      mockRecommendationRepo.findOne.mockResolvedValue(mockRec);

      const result = await service.submitRemediationPlan(
        1,
        'Triển khai tường lửa mới',
        '2026-12-31',
      );

      expect(mockRecommendationRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          remediationPlan: 'Triển khai tường lửa mới',
          auditeeTargetDate: '2026-12-31',
          status: 'InProgress',
        }),
      );
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'info',
          recipientId: 4,
        }),
      );
      expect(result).toEqual(mockRec);
    });
  });

  describe('updateProgress', () => {
    it('should mark Completed and send notification when progress reaches 100%', async () => {
      const mockRec = {
        id: 2,
        recommendation: 'Soát xét lại danh mục rủi ro',
        assignedToId: 3,
      };
      mockRecommendationRepo.findOne.mockResolvedValue(mockRec);

      const result = await service.updateProgress(
        2,
        100,
        'Đã hoàn thành rà soát',
        'Ghi chú đính kèm',
      );

      expect(mockRecommendationRepo.update).toHaveBeenCalledWith(
        2,
        expect.objectContaining({
          progressPercent: 100,
          status: 'Completed',
          closureStatus: 'PendingKTNBReview',
        }),
      );
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          recipientId: 3,
        }),
      );
      expect(result).toEqual(mockRec);
    });
  });

  describe('verify', () => {
    it('should throw NotFoundException if recommendation not found', async () => {
      mockRecommendationRepo.findOne.mockResolvedValue(null);
      await expect(
        service.verify(999, 'Done', { role: 'Admin' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update recommendation status to Verified', async () => {
      const mockRec = { id: 1, assignedToId: 2 };
      mockRecommendationRepo.findOne.mockResolvedValue(mockRec);

      await service.verify(1, 'KTV xác nhận khắc phục tốt', {
        userId: 2,
        role: 'KTV',
      });

      expect(mockRecommendationRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'Verified',
          verificationNotes: 'KTV xác nhận khắc phục tốt',
          closureStatus: 'PendingTeamLeadOpinion',
        }),
      );
    });
  });

  describe('getStats', () => {
    it('should return aggregated metrics correctly', async () => {
      mockRecommendationRepo.count.mockResolvedValue(10);
      mockRecommendationRepo.find.mockResolvedValue([
        {
          id: 1,
          legacyDepartment: 'RiskDept',
          status: 'Verified',
          auditFinding: {
            riskLevel: 'High',
            engagement: { name: 'Cuộc kiểm toán 2026' },
          },
        },
      ]);

      const stats = await service.getStats();
      expect(stats.total).toBe(10);
      expect(stats.byDepartment).toHaveProperty('RiskDept');
      expect(stats.byFindingRiskLevel).toHaveProperty('High', 1);
    });

    // TC-REC-01: the overdue board needs the overdue counter and the SLA breakdown.
    it('should expose the overdue count and SLA status breakdown', async () => {
      mockRecommendationRepo.count.mockImplementation((options?: any) => {
        const where = options?.where ?? {};
        if (where.status === 'Overdue') return Promise.resolve(17);
        if (where.status === 'InProgress') return Promise.resolve(23);
        if (where.slaStatus === 'QuaHan') return Promise.resolve(19);
        if (where.slaStatus === 'ChuaDenHan') return Promise.resolve(41);
        if (where.slaStatus === 'GiaHan') return Promise.resolve(3);
        return Promise.resolve(0);
      });
      mockRecommendationRepo.find.mockResolvedValue([]);

      const stats = await service.getStats();

      expect(stats.overdue).toBe(17);
      expect(stats.slaQuaHan).toBe(19);
      expect(stats.slaChuaDenHan).toBe(41);
      expect(stats.slaGiaHan).toBe(3);
      expect(stats.inProgress).toBe(23);
      expect(mockRecommendationRepo.count).toHaveBeenCalledWith({
        where: { status: 'Overdue' },
      });
    });
  });

  describe('Risk Acceptance Workflow (IIA Standard 7.3)', () => {
    it('should request risk acceptance successfully', async () => {
      mockRecommendationRepo.findOne.mockResolvedValue({ id: 1, status: 'Open' });

      await service.requestRiskAcceptance(1, 'Chi phí khắc phục quá lớn so với rủi ro', {
        userId: 20,
        fullName: 'ĐVĐKT Lead',
      });

      expect(mockRecommendationRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          riskAcceptanceStatus: 'PendingCAE',
          riskAcceptanceReason: 'Chi phí khắc phục quá lớn so với rủi ro',
          riskAcceptanceRequestedById: 20,
        }),
      );
    });

    it('should throw BadRequestException if reason is empty', async () => {
      await expect(service.requestRiskAcceptance(1, '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow CAE to forward risk acceptance to BKS', async () => {
      mockRecommendationRepo.findOne.mockResolvedValue({
        id: 1,
        riskAcceptanceStatus: 'PendingCAE',
      });

      await service.reviewRiskAcceptanceByCAE(
        1,
        true,
        'Đã đánh giá, kiến nghị vượt thẩm quyền CAE cần BKS duyệt',
      );

      expect(mockRecommendationRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          riskAcceptanceStatus: 'PendingBKS',
          riskAcceptanceNotes: 'Đã đánh giá, kiến nghị vượt thẩm quyền CAE cần BKS duyệt',
        }),
      );
    });

    it('should allow CAE to reject risk acceptance', async () => {
      mockRecommendationRepo.findOne.mockResolvedValue({
        id: 1,
        riskAcceptanceStatus: 'PendingCAE',
      });

      await service.reviewRiskAcceptanceByCAE(
        1,
        false,
        'Rủi ro trọng yếu, không thể chấp nhận',
      );

      expect(mockRecommendationRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          riskAcceptanceStatus: 'Rejected',
        }),
      );
    });

    it('should approve risk acceptance and close recommendation', async () => {
      mockRecommendationRepo.findOne.mockResolvedValue({
        id: 1,
        riskAcceptanceStatus: 'PendingBKS',
        riskAcceptanceReason: 'Lý do ban đầu',
      });

      await service.approveRiskAcceptance(
        1,
        'BKS phê duyệt chấp thuận rủi ro theo Chuẩn mực IIA 7.3',
        { userId: 1, fullName: 'Trưởng BKS' },
      );

      expect(mockRecommendationRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          riskAcceptanceStatus: 'Accepted',
          closureStatus: 'Closed',
          closedBy: 1,
          closedReason: expect.stringContaining('IIA Standard 7.3'),
        }),
      );
    });

    it('should reject risk acceptance', async () => {
      mockRecommendationRepo.findOne.mockResolvedValue({
        id: 1,
        riskAcceptanceStatus: 'PendingBKS',
      });

      await service.rejectRiskAcceptance(
        1,
        'BKS yêu cầu tiếp tục khắc phục',
        { userId: 1 },
      );

      expect(mockRecommendationRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          riskAcceptanceStatus: 'Rejected',
        }),
      );
    });
  });

  describe('Remediation Lifecycle & Closure Workflow (Steps 4 & 5)', () => {
    describe('ktnbReview (Step 4)', () => {
      it('should throw NotFoundException if recommendation not found', async () => {
        mockRecommendationRepo.findOne.mockResolvedValue(null);
        await expect(service.ktnbReview(999, 'Notes', { userId: 1 })).rejects.toThrow(NotFoundException);
      });

      it('should throw ForbiddenException if user is not the designated reviewer and not privileged', async () => {
        mockRecommendationRepo.findOne.mockResolvedValue({
          id: 1,
          ktnbReviewerId: 10,
        });
        await expect(
          service.ktnbReview(1, 'Notes', { userId: 99, role: 'KTV' })
        ).rejects.toThrow(ForbiddenException);
      });

      it('should update status to Verified and closureStatus to PendingTeamLeadOpinion', async () => {
        const mockRec = { id: 1, ktnbReviewerId: 10 };
        mockRecommendationRepo.findOne.mockResolvedValue(mockRec);

        await service.ktnbReview(1, 'KTV xác nhận hồ sơ đạt chuẩn', {
          userId: 10,
          role: 'KTV',
        });

        expect(mockRecommendationRepo.update).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            ktnbReviewNotes: 'KTV xác nhận hồ sơ đạt chuẩn',
            status: 'Verified',
            closureStatus: 'PendingTeamLeadOpinion',
          }),
        );
      });
    });

    describe('teamLeadOpinion (Step 5a)', () => {
      it('should throw BadRequestException if opinion is empty', async () => {
        await expect(service.teamLeadOpinion(1, '', { userId: 1 })).rejects.toThrow(BadRequestException);
      });

      it('should throw NotFoundException if recommendation not found', async () => {
        mockRecommendationRepo.findOne.mockResolvedValue(null);
        await expect(service.teamLeadOpinion(999, 'Ý kiến', { userId: 1 })).rejects.toThrow(NotFoundException);
      });

      it('should update teamLeadClosureOpinion and set PendingTeamLeadOpinion', async () => {
        const mockRec = {
          id: 1,
          auditFinding: { engagement: { leadAuditorId: 5 } },
        };
        mockRecommendationRepo.findOne.mockResolvedValue(mockRec);

        await service.teamLeadOpinion(1, 'Đồng ý với kết quả thẩm tra', {
          userId: 5,
          username: 'danhpc',
          role: 'lead_auditor',
        });

        expect(mockRecommendationRepo.update).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            teamLeadClosureOpinion: 'Đồng ý với kết quả thẩm tra',
            teamLeadClosureOpinionBy: 5,
          }),
        );
      });
    });

    describe('close (Step 5b)', () => {
      it('should throw NotFoundException if recommendation not found', async () => {
        mockRecommendationRepo.findOne.mockResolvedValue(null);
        await expect(service.close(999, 'Reason', { userId: 1 })).rejects.toThrow(NotFoundException);
      });

      it('should throw BadRequestException if team lead opinion is missing', async () => {
        mockRecommendationRepo.findOne.mockResolvedValue({
          id: 1,
          teamLeadClosureOpinion: null,
        });
        await expect(service.close(1, 'Phê duyệt đóng', { userId: 1 })).rejects.toThrow(
          /Không thể đóng kiến nghị khi chưa có ý kiến Trưởng đoàn/,
        );
      });

      it('should throw BadRequestException if closedReason is empty', async () => {
        mockRecommendationRepo.findOne.mockResolvedValue({
          id: 1,
          teamLeadClosureOpinion: 'Đồng thuận',
        });
        await expect(service.close(1, '   ', { userId: 1 })).rejects.toThrow(
          /Vui lòng nhập lý do đóng kiến nghị/,
        );
      });

      it('should update closureStatus to Closed with closedReason and closedAt', async () => {
        mockRecommendationRepo.findOne.mockResolvedValue({
          id: 1,
          teamLeadClosureOpinion: 'Đồng thuận đóng',
        });

        await service.close(1, 'CAE phê duyệt đóng chính thức', { userId: 1 });

        expect(mockRecommendationRepo.update).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            status: 'Verified',
            closureStatus: 'Closed',
            closedReason: 'CAE phê duyệt đóng chính thức',
            closedBy: 1,
          }),
        );
      });
    });
  });

  // ==========================================================================
  // TC-REC-01 "Giám Sát Tình Hình Khắc Phục Kiến Nghị Toàn Hàng"
  // Board sees every recommendation past its deadline with the number of days
  // late + red SLA highlight; escalation follows the thresholds implemented in
  // checkAndMarkOverdue(): daysOverdue >= 15 -> Level 1, >= 30 -> Level 2,
  // >= 60 -> Level 3 (Level 3 is also the only level that reports to BKS/CAE).
  // ==========================================================================
  describe('checkAndMarkOverdue (TC-REC-01 SLA monitoring & escalation)', () => {
    const DAY_MS = 1000 * 60 * 60 * 24;
    const REC_ID = 42;
    const ASSIGNEE_ID = 77;
    const DEPT = 'Chi nhánh Hà Nội';
    const REC_TITLE = 'Nâng cấp hệ thống Core Banking và sao lưu dự phòng dữ liệu';
    const SLA_MAILBOX = 'admin@nganhang.vn';

    /** UTC calendar date (YYYY-MM-DD) at `days` offset from today, to match
     *  the service's own `new Date().toISOString().split('T')[0]` computation. */
    const utcDateOffset = (days: number) =>
      new Date(Date.now() + days * DAY_MS).toISOString().split('T')[0];
    const daysAgo = (days: number) => utcDateOffset(-days);

    const buildRec = (overrides: Record<string, any> = {}): Recommendation =>
      ({
        id: REC_ID,
        recommendation: REC_TITLE,
        legacyDepartment: DEPT,
        assignedToId: ASSIGNEE_ID,
        status: 'InProgress',
        slaStatus: 'ChuaDenHan',
        escalationLevel: 0,
        dueDate: daysAgo(1),
        ...overrides,
      }) as unknown as Recommendation;

    /** One page of records for `skip=0`, empty pages afterwards, so the
     *  service's `while (hasMore)` pagination loop terminates. */
    const stageRecords = (records: Recommendation[]) => {
      mockRecommendationRepo.find.mockImplementation((options?: any) =>
        Promise.resolve(options?.skip ? [] : records),
      );
      mockRecommendationRepo.update.mockResolvedValue({ affected: 1 });
    };

    /** Exact text produced by checkAndMarkOverdue() for each escalation level.
     *  Wording matches the real comparisons (>= 15 / >= 30 / >= 60 days). */
    const expectedEscalationMessage = (level: number, days: number) => {
      if (level === 3) {
        return `🔴 CẢNH BÁO CẤP CAO (Level 3 - Quá hạn ≥ 60 ngày): Kiến nghị kiểm toán tại đơn vị '${DEPT}' đã quá hạn ${days} ngày. Vấn đề được báo cáo khẩn cấp lên Ban Kiểm Soát & Giám đốc Khối KTNB!`;
      }
      if (level === 2) {
        return `🟠 CẢNH BÁO CẤP 2 (Level 2 - Quá hạn ≥ 30 ngày): Kiến nghị tại đơn vị '${DEPT}' đã quá hạn ${days} ngày. Cảnh báo leo thang gửi Giám đốc Vùng và Phó Tổng Giám đốc phụ trách!`;
      }
      return `🟡 CẢNH BÁO CẤP 1 (Level 1 - Quá hạn ≥ 15 ngày): Kiến nghị tại đơn vị '${DEPT}' đã quá hạn ${days} ngày. Nhắc nhở gửi trực tiếp Giám đốc Chi nhánh/Đơn vị.`;
    };

    const ESCALATION_MATRIX = [
      { days: 1, level: 0 },
      { days: 14, level: 0 },
      { days: 15, level: 1 },
      { days: 16, level: 1 },
      { days: 29, level: 1 },
      { days: 30, level: 2 },
      { days: 31, level: 2 },
      { days: 59, level: 2 },
      { days: 60, level: 3 },
      { days: 61, level: 3 },
    ];

    it.each(ESCALATION_MATRIX)(
      'marks a recommendation $days day(s) past its deadline Overdue/QuaHan and escalates to level $level',
      async ({ days, level }) => {
        const rec = buildRec({ dueDate: daysAgo(days) });
        stageRecords([rec]);

        const escalatedCount = await service.checkAndMarkOverdue();

        // ---- exact repository payload: status + SLA + escalation fields ----
        const expectedUpdate: Record<string, any> = {
          status: 'Overdue',
          slaStatus: 'QuaHan',
        };
        if (level > 0) {
          expectedUpdate.escalationLevel = level;
          expectedUpdate.escalatedAt = expect.any(Date);
        }
        expect(mockRecommendationRepo.update).toHaveBeenCalledTimes(1);
        expect(mockRecommendationRepo.update).toHaveBeenCalledWith(
          REC_ID,
          expectedUpdate,
        );

        // ---- returned value = number of escalations dispatched ----
        expect(escalatedCount).toBe(level > 0 ? 1 : 0);

        if (level === 0) {
          // < 15 days late: red SLA is set but no escalation is dispatched.
          expect(mockNotificationsService.create).not.toHaveBeenCalled();
          expect(mockMailService.sendOverdueWarning).not.toHaveBeenCalled();
          return;
        }

        // ---- escalation notification: recipient, level, type and exact text
        expect(mockNotificationsService.create).toHaveBeenNthCalledWith(1, {
          type: level === 3 ? 'error' : 'warning',
          title: `Cảnh báo leo thang Level ${level}`,
          message: expectedEscalationMessage(level, days),
          recipientId: ASSIGNEE_ID,
          link: `/recommendations?id=${REC_ID}`,
        });

        // ---- BKS/CAE report only at the highest implemented level (>= 60d)
        expect(mockNotificationsService.create).toHaveBeenCalledTimes(
          level === 3 ? 2 : 1,
        );
        if (level === 3) {
          expect(mockNotificationsService.create).toHaveBeenNthCalledWith(2, {
            type: 'error',
            title: 'BÁO CÁO BAN KIỂM SOÁT',
            // Wording matches the real comparison (daysOverdue >= 60).
            message: `Báo cáo khẩn cấp: Đơn vị '${DEPT}' chậm khắc phục kiến nghị từ 60 ngày trở lên. Tiêu đề: ${REC_TITLE.slice(0, 40)}...`,
            recipientId: ASSIGNEE_ID,
            link: `/recommendations?id=${REC_ID}`,
          });
        }

        // ---- exact overdue email dispatch ----
        expect(mockMailService.sendOverdueWarning).toHaveBeenCalledTimes(1);
        expect(mockMailService.sendOverdueWarning).toHaveBeenCalledWith(
          SLA_MAILBOX,
          REC_TITLE,
          rec.dueDate,
          DEPT,
        );
      },
    );

    it.each([
      ['the deadline day itself', 0],
      ['a future deadline', 5],
    ])(
      'does not mark a recommendation overdue and sends nothing when %s has not passed',
      async (_label, offsetDays) => {
        stageRecords([
          buildRec({
            dueDate: utcDateOffset(offsetDays as number),
            slaStatus: 'ChuaDenHan',
          }),
        ]);

        const escalatedCount = await service.checkAndMarkOverdue();

        expect(escalatedCount).toBe(0);
        expect(mockRecommendationRepo.update).not.toHaveBeenCalled();
        expect(mockNotificationsService.create).not.toHaveBeenCalled();
        expect(mockMailService.sendOverdueWarning).not.toHaveBeenCalled();
      },
    );

    it('resets slaStatus, escalationLevel and Overdue status when a deadline is moved to the future again', async () => {
      stageRecords([
        buildRec({
          dueDate: utcDateOffset(30),
          slaStatus: 'QuaHan',
          status: 'Overdue',
          escalationLevel: 3,
        }),
      ]);

      const escalatedCount = await service.checkAndMarkOverdue();

      expect(escalatedCount).toBe(0);
      // Fixed payload (BUG 1): the SLA flag, the escalation level and the stale
      // Overdue status are all restored, so a later breach escalates again and
      // getStats().overdue no longer counts a recommendation that is in time.
      // progressPercent is 0 here -> 'NotStarted'.
      expect(mockRecommendationRepo.update).toHaveBeenCalledTimes(1);
      expect(mockRecommendationRepo.update).toHaveBeenCalledWith(REC_ID, {
        slaStatus: 'ChuaDenHan',
        escalationLevel: 0,
        status: 'NotStarted',
      });
      expect(mockNotificationsService.create).not.toHaveBeenCalled();
      expect(mockMailService.sendOverdueWarning).not.toHaveBeenCalled();
    });

    it('never rewrites the SLA status of a GiaHan (extended) recommendation that is still in time', async () => {
      stageRecords([
        buildRec({ dueDate: utcDateOffset(3), slaStatus: 'GiaHan' }),
      ]);

      const escalatedCount = await service.checkAndMarkOverdue();

      expect(escalatedCount).toBe(0);
      expect(mockRecommendationRepo.update).not.toHaveBeenCalled();
      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });

    it('keeps the GiaHan SLA status while still escalating a recommendation past its deadline', async () => {
      stageRecords([buildRec({ dueDate: daysAgo(60), slaStatus: 'GiaHan' })]);

      const escalatedCount = await service.checkAndMarkOverdue();

      expect(escalatedCount).toBe(1);
      const payload: Record<string, any> =
        mockRecommendationRepo.update.mock.calls[0][1];
      expect(payload).toEqual({
        status: 'Overdue',
        escalationLevel: 3,
        escalatedAt: expect.any(Date),
      });
      expect(payload).not.toHaveProperty('slaStatus');
      expect(mockNotificationsService.create).toHaveBeenCalledTimes(2);
      expect(mockMailService.sendOverdueWarning).toHaveBeenCalledTimes(1);
    });

    it.each([
      { days: 30, level: 2, expectedNotifications: 1 },
      { days: 60, level: 3, expectedNotifications: 2 },
    ])(
      'routes the level $level escalation to the Admin/CAE fallback recipient (id 1) when nobody is assigned',
      async ({ days, level, expectedNotifications }) => {
        stageRecords([buildRec({ dueDate: daysAgo(days), assignedToId: null })]);

        await service.checkAndMarkOverdue();

        expect(mockNotificationsService.create).toHaveBeenCalledTimes(
          expectedNotifications,
        );
        expect(mockNotificationsService.create).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            title: `Cảnh báo leo thang Level ${level}`,
            recipientId: 1,
          }),
        );
        if (level === 3) {
          expect(mockNotificationsService.create).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
              title: 'BÁO CÁO BAN KIỂM SOÁT',
              recipientId: 1,
            }),
          );
        }
      },
    );

    it('scans only NotStarted/InProgress/Overdue recommendations, in pages of 100', async () => {
      mockRecommendationRepo.find.mockResolvedValue([]);
      mockRecommendationRepo.update.mockResolvedValue({ affected: 1 });

      await service.checkAndMarkOverdue();

      expect(mockRecommendationRepo.find).toHaveBeenCalledTimes(1);
      const options: Record<string, any> =
        mockRecommendationRepo.find.mock.calls[0][0];
      expect(options.take).toBe(100);
      expect(options.skip).toBe(0);
      expect(options.where.status.type).toBe('in');
      expect(options.where.status.value).toEqual([
        'NotStarted',
        'InProgress',
        'Overdue',
      ]);
    });

    it('keeps processing recommendations returned on later pages of the batch scan', async () => {
      const firstPage = buildRec({ id: 1, dueDate: daysAgo(20) });
      const secondPage = buildRec({ id: 2, dueDate: daysAgo(31) });
      mockRecommendationRepo.find.mockImplementation((options?: any) => {
        if (!options?.skip) return Promise.resolve([firstPage]);
        if (options.skip === 100) return Promise.resolve([secondPage]);
        return Promise.resolve([]);
      });
      mockRecommendationRepo.update.mockResolvedValue({ affected: 1 });

      const escalatedCount = await service.checkAndMarkOverdue();

      expect(escalatedCount).toBe(2);
      expect(mockRecommendationRepo.find).toHaveBeenCalledTimes(3);
      expect(mockRecommendationRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ escalationLevel: 1 }),
      );
      expect(mockRecommendationRepo.update).toHaveBeenCalledWith(
        2,
        expect.objectContaining({ escalationLevel: 2 }),
      );
      expect(mockNotificationsService.create).toHaveBeenCalledTimes(2);
    });

    describe('idempotency', () => {
      it('does not double-notify or re-mark escalation fields when the check runs twice', async () => {
        const store: Record<string, any> = buildRec({ dueDate: daysAgo(60) });
        mockRecommendationRepo.find.mockImplementation((options?: any) =>
          Promise.resolve(options?.skip ? [] : [store]),
        );
        // Faithful repository double: writes are persisted and read back.
        mockRecommendationRepo.update.mockImplementation(
          (_id: number, data: Record<string, any>) => {
            Object.assign(store, data);
            return Promise.resolve({ affected: 1 });
          },
        );

        const firstRun = await service.checkAndMarkOverdue();

        expect(firstRun).toBe(1);
        expect(mockNotificationsService.create).toHaveBeenCalledTimes(2);
        expect(mockMailService.sendOverdueWarning).toHaveBeenCalledTimes(1);
        expect(store.status).toBe('Overdue');
        expect(store.slaStatus).toBe('QuaHan');
        expect(store.escalationLevel).toBe(3);
        expect(store.escalatedAt).toBeInstanceOf(Date);

        mockRecommendationRepo.update.mockClear();

        const secondRun = await service.checkAndMarkOverdue();

        expect(secondRun).toBe(0);
        // No additional notification / email on the second run.
        expect(mockNotificationsService.create).toHaveBeenCalledTimes(2);
        expect(mockMailService.sendOverdueWarning).toHaveBeenCalledTimes(1);
        // Only the (identical) overdue flag is re-written: no escalation fields.
        expect(mockRecommendationRepo.update).toHaveBeenCalledTimes(1);
        expect(mockRecommendationRepo.update).toHaveBeenCalledWith(REC_ID, {
          status: 'Overdue',
          slaStatus: 'QuaHan',
        });
        expect(store.escalationLevel).toBe(3);
      });

      it('does not notify again when the computed level equals the stored level', async () => {
        stageRecords([buildRec({ dueDate: daysAgo(45), escalationLevel: 2 })]);

        const escalatedCount = await service.checkAndMarkOverdue();

        expect(escalatedCount).toBe(0);
        expect(mockNotificationsService.create).not.toHaveBeenCalled();
        expect(mockMailService.sendOverdueWarning).not.toHaveBeenCalled();
        expect(mockRecommendationRepo.update).toHaveBeenCalledWith(REC_ID, {
          status: 'Overdue',
          slaStatus: 'QuaHan',
        });
      });

      it('escalates an already level-1 recommendation to level 2 exactly once', async () => {
        stageRecords([buildRec({ dueDate: daysAgo(30), escalationLevel: 1 })]);

        const escalatedCount = await service.checkAndMarkOverdue();

        expect(escalatedCount).toBe(1);
        expect(mockRecommendationRepo.update).toHaveBeenCalledTimes(1);
        expect(mockRecommendationRepo.update).toHaveBeenCalledWith(REC_ID, {
          status: 'Overdue',
          slaStatus: 'QuaHan',
          escalationLevel: 2,
          escalatedAt: expect.any(Date),
        });
        expect(mockNotificationsService.create).toHaveBeenCalledTimes(1);
        expect(mockNotificationsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'warning',
            title: 'Cảnh báo leo thang Level 2',
            recipientId: ASSIGNEE_ID,
          }),
        );
        expect(mockMailService.sendOverdueWarning).toHaveBeenCalledTimes(1);
      });
    });

    // ======================================================================
    // Regression tests for the production fixes:
    //  BUG 1 — escalationLevel is reset once a recommendation is no longer
    //          past its deadline, so a later breach notifies again.
    //  BUG 2 — the level-3 "BÁO CÁO BAN KIỂM SOÁT" goes to a BKS/CAE user,
    //          not to the assignee (fallback kept when no BKS user exists).
    //  BUG 3 — the escalation wording matches the real >= comparisons.
    // ======================================================================
    describe('production fixes (BUG 1/2/3 regressions)', () => {
      /** Faithful repository double: writes are persisted and read back. */
      const stagePersistentStore = (store: Record<string, any>) => {
        mockRecommendationRepo.find.mockImplementation((options?: any) =>
          Promise.resolve(options?.skip ? [] : [store]),
        );
        mockRecommendationRepo.update.mockImplementation(
          (_id: number, data: Record<string, any>) => {
            Object.assign(store, data);
            return Promise.resolve({ affected: 1 });
          },
        );
      };

      it('re-notifies Level 1 after the deadline moves to the future and is breached again (BUG 1)', async () => {
        const store: Record<string, any> = buildRec({
          dueDate: daysAgo(15),
          slaStatus: 'ChuaDenHan',
          status: 'InProgress',
          escalationLevel: 0,
          progressPercent: 30,
        });
        stagePersistentStore(store);

        // 1) First breach: 15 days late -> Level 1 notification.
        expect(await service.checkAndMarkOverdue()).toBe(1);
        expect(store.escalationLevel).toBe(1);
        expect(mockNotificationsService.create).toHaveBeenCalledTimes(1);
        expect(mockNotificationsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Cảnh báo leo thang Level 1',
            recipientId: ASSIGNEE_ID,
            message: expectedEscalationMessage(1, 15),
          }),
        );

        // 2) The deadline is moved to the future: level, SLA and status reset.
        store.dueDate = utcDateOffset(30);
        mockNotificationsService.create.mockClear();

        expect(await service.checkAndMarkOverdue()).toBe(0);
        expect(store.escalationLevel).toBe(0);
        expect(store.slaStatus).toBe('ChuaDenHan');
        expect(store.status).toBe('InProgress'); // progressPercent 30 > 0
        expect(mockNotificationsService.create).not.toHaveBeenCalled();

        // 3) Second breach at the SAME level must notify again.
        store.dueDate = daysAgo(15);
        expect(await service.checkAndMarkOverdue()).toBe(1);
        expect(store.escalationLevel).toBe(1);
        expect(mockNotificationsService.create).toHaveBeenCalledTimes(1);
        expect(mockNotificationsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'warning',
            title: 'Cảnh báo leo thang Level 1',
            recipientId: ASSIGNEE_ID,
          }),
        );
      });

      it('getStats().overdue no longer counts the row whose deadline moved to the future (BUG 1)', async () => {
        const store: Record<string, any> = buildRec({
          dueDate: daysAgo(20),
          slaStatus: 'QuaHan',
          status: 'Overdue',
          escalationLevel: 1,
          progressPercent: 40,
        });
        mockRecommendationRepo.count.mockImplementation((options?: any) =>
          Promise.resolve(
            options?.where?.status === 'Overdue' && store.status === 'Overdue'
              ? 1
              : 0,
          ),
        );
        stagePersistentStore(store);

        // The row is genuinely late before the deadline is moved.
        expect((await service.getStats()).overdue).toBe(1);

        store.dueDate = utcDateOffset(20);
        expect(await service.checkAndMarkOverdue()).toBe(0);

        expect(store.escalationLevel).toBe(0);
        expect(store.status).toBe('InProgress'); // progressPercent 40 > 0
        expect((await service.getStats()).overdue).toBe(0);
      });

      it('lowers a stale escalationLevel while the row is still overdue (BUG 1)', async () => {
        const store: Record<string, any> = buildRec({
          dueDate: daysAgo(20), // 20 ngày trễ -> Level 1 (mức lưu trữ cũ là 2)
          slaStatus: 'QuaHan',
          status: 'Overdue',
          escalationLevel: 2,
          progressPercent: 0,
        });
        stagePersistentStore(store);

        expect(await service.checkAndMarkOverdue()).toBe(0);

        // Vẫn quá hạn nên status/SLA giữ nguyên, nhưng mức leo thang phải phản
        // ánh đúng mức vi phạm hiện tại (1) để lần vi phạm sau còn thông báo.
        expect(store.escalationLevel).toBe(1);
        expect(store.status).toBe('Overdue');
        expect(mockRecommendationRepo.update).toHaveBeenCalledWith(REC_ID, {
          status: 'Overdue',
          slaStatus: 'QuaHan',
          escalationLevel: 1,
        });
        expect(mockNotificationsService.create).not.toHaveBeenCalled();
        expect(mockMailService.sendOverdueWarning).not.toHaveBeenCalled();
      });

      it('still resets escalationLevel for a GiaHan row that is back in time, without touching slaStatus (BUG 1)', async () => {
        stageRecords([
          buildRec({
            dueDate: utcDateOffset(10),
            slaStatus: 'GiaHan',
            status: 'Overdue',
            escalationLevel: 2,
            progressPercent: 60,
          }),
        ]);

        expect(await service.checkAndMarkOverdue()).toBe(0);

        expect(mockRecommendationRepo.update).toHaveBeenCalledTimes(1);
        expect(mockRecommendationRepo.update).toHaveBeenCalledWith(REC_ID, {
          escalationLevel: 0,
          status: 'InProgress',
        });
      });

      it('routes the level-3 BKS report to a Ban Kiểm Soát user, not to the assignee (BUG 2)', async () => {
        mockUserRepo.find.mockResolvedValue([
          { id: 900, role: { name: 'Kiểm toán viên' } },
          { id: 901, role: { name: 'Trưởng Ban Kiểm Soát' } },
          { id: 1, role: { name: 'Admin' } },
        ]);
        stageRecords([buildRec({ dueDate: daysAgo(60) })]);

        expect(await service.checkAndMarkOverdue()).toBe(1);

        // ...the level-3 escalation still goes to the assignee...
        expect(mockNotificationsService.create).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            title: 'Cảnh báo leo thang Level 3',
            recipientId: ASSIGNEE_ID,
          }),
        );
        // ...but the BKS report goes to the Ban Kiểm Soát.
        expect(mockNotificationsService.create).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            type: 'error',
            title: 'BÁO CÁO BAN KIỂM SOÁT',
            recipientId: 901,
            link: `/recommendations?id=${REC_ID}`,
          }),
        );
      });

      it('prefers CAE (Lãnh đạo KTNB) over Admin when no Ban Kiểm Soát user exists (BUG 2)', async () => {
        mockUserRepo.find.mockResolvedValue([
          { id: 1, role: { name: 'Admin' } },
          { id: 903, role: { name: 'Giám đốc Khối KTNB' } },
        ]);
        stageRecords([buildRec({ dueDate: daysAgo(61) })]);

        await service.checkAndMarkOverdue();

        expect(mockNotificationsService.create).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            title: 'BÁO CÁO BAN KIỂM SOÁT',
            recipientId: 903,
          }),
        );
      });

      it('falls back to the assignee for the BKS report when no BKS/CAE/Admin user exists (BUG 2)', async () => {
        mockUserRepo.find.mockResolvedValue([
          { id: 900, role: { name: 'Kiểm toán viên' } },
          { id: 902, role: { name: 'Đơn vị được kiểm toán' } },
        ]);
        stageRecords([buildRec({ dueDate: daysAgo(60) })]);

        await service.checkAndMarkOverdue();

        expect(mockNotificationsService.create).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            title: 'BÁO CÁO BAN KIỂM SOÁT',
            recipientId: ASSIGNEE_ID,
          }),
        );
      });

      it('falls back to the assignee for the BKS report when the recipient lookup fails (BUG 2)', async () => {
        mockUserRepo.find.mockRejectedValue(new Error('DB không khả dụng'));
        stageRecords([buildRec({ dueDate: daysAgo(60) })]);

        await expect(service.checkAndMarkOverdue()).resolves.toBe(1);

        expect(mockNotificationsService.create).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            title: 'BÁO CÁO BAN KIỂM SOÁT',
            recipientId: ASSIGNEE_ID,
          }),
        );
      });
    });
  });

  // ==========================================================================
  // Residual of BUG 1: the API path (update) must apply the SAME reset as the
  // daily cron when the caller pushes dueDate out of the past. Otherwise
  // escalationLevel/status stay stale until the next cron run (up to ~24h):
  // getStats().overdue over-counts and a re-breach at the same level cannot
  // re-alert (notification condition is `newLevel > storedLevel`).
  // ==========================================================================
  describe('update - deadline moved out of the past (BUG 1 residual)', () => {
    const DAY_MS = 1000 * 60 * 60 * 24;
    const REC_ID = 42;
    const REC_TITLE =
      'Nâng cấp hệ thống Core Banking và sao lưu dự phòng dữ liệu';
    const DEPT = 'Chi nhánh Hà Nội';

    /** UTC calendar date (YYYY-MM-DD) at `days` offset from today, to match
     *  the service's own `new Date().toISOString().split('T')[0]` computation. */
    const utcDateOffset = (days: number) =>
      new Date(Date.now() + days * DAY_MS).toISOString().split('T')[0];
    const daysAgo = (days: number) => utcDateOffset(-days);

    /** Faithful repository double: findOne reads and update persists the row. */
    const stagePersistentStore = (store: Record<string, any>) => {
      mockRecommendationRepo.findOne.mockResolvedValue(store);
      mockRecommendationRepo.update.mockImplementation(
        (_id: number, data: Record<string, any>) => {
          Object.assign(store, data);
          return Promise.resolve({ affected: 1 });
        },
      );
    };

    const buildOverdueStore = (overrides: Record<string, any> = {}) => ({
      id: REC_ID,
      recommendation: REC_TITLE,
      legacyDepartment: DEPT,
      assignedToId: 77,
      dueDate: daysAgo(20),
      slaStatus: 'QuaHan',
      status: 'Overdue',
      escalationLevel: 2,
      progressPercent: 40,
      closureStatus: 'PendingAuditeeAction',
      ...overrides,
    });

    it('resets slaStatus, escalationLevel and Overdue status in the same write as the new dueDate', async () => {
      const store = buildOverdueStore();
      const futureDueDate = utcDateOffset(20);
      stagePersistentStore(store);

      await service.update(REC_ID, { dueDate: futureDueDate } as any);

      // 1st write = the caller's payload; 2nd write = the full SLA reset, which
      // must land together with the new deadline instead of waiting for the cron.
      expect(mockRecommendationRepo.update).toHaveBeenNthCalledWith(1, REC_ID, {
        dueDate: futureDueDate,
      });
      expect(mockRecommendationRepo.update).toHaveBeenCalledTimes(2);
      expect(mockRecommendationRepo.update).toHaveBeenNthCalledWith(2, REC_ID, {
        slaStatus: 'ChuaDenHan',
        escalationLevel: 0,
        status: 'InProgress',
      });
      expect(store).toMatchObject({
        slaStatus: 'ChuaDenHan',
        escalationLevel: 0,
        status: 'InProgress',
      });
    });

    it('restores status to NotStarted when the moved row has no progress yet', async () => {
      const store = buildOverdueStore({ progressPercent: 0 });
      stagePersistentStore(store);

      await service.update(REC_ID, { dueDate: utcDateOffset(15) } as any);

      expect(mockRecommendationRepo.update).toHaveBeenNthCalledWith(2, REC_ID, {
        slaStatus: 'ChuaDenHan',
        escalationLevel: 0,
        status: 'NotStarted',
      });
      expect(store.status).toBe('NotStarted');
    });

    it('keeps the GiaHan slaStatus but still resets the escalation level', async () => {
      const store = buildOverdueStore({
        slaStatus: 'GiaHan',
        escalationLevel: 3,
        progressPercent: 60,
      });
      stagePersistentStore(store);

      await service.update(REC_ID, { dueDate: utcDateOffset(10) } as any);

      expect(mockRecommendationRepo.update).toHaveBeenCalledTimes(2);
      const resetPayload: Record<string, any> =
        mockRecommendationRepo.update.mock.calls[1][1];
      expect(resetPayload).toEqual({
        escalationLevel: 0,
        status: 'InProgress',
      });
      // GiaHan chỉ chặn việc ghi đè slaStatus, không chặn việc khôi phục mức.
      expect(resetPayload).not.toHaveProperty('slaStatus');
      expect(store.slaStatus).toBe('GiaHan');
      expect(store.escalationLevel).toBe(0);
      expect(store.status).toBe('InProgress');
    });

    it('getStats().overdue no longer counts the row after pushing its deadline to the future', async () => {
      const store = buildOverdueStore();
      mockRecommendationRepo.find.mockResolvedValue([]);
      mockRecommendationRepo.count.mockImplementation((options?: any) =>
        Promise.resolve(
          options?.where?.status === 'Overdue' &&
            store.status === 'Overdue'
            ? 1
            : 0,
        ),
      );
      stagePersistentStore(store);

      // The row is genuinely late before the deadline is moved.
      expect((await service.getStats()).overdue).toBe(1);

      await service.update(REC_ID, { dueDate: utcDateOffset(20) } as any);

      expect(store.escalationLevel).toBe(0);
      expect(store.status).toBe('InProgress');
      expect((await service.getStats()).overdue).toBe(0);
    });
  });
});
