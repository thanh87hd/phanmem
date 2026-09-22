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
});
