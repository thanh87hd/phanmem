import { Test, TestingModule } from '@nestjs/testing';
import { WorkingPapersService } from './working-papers.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WorkingPaper } from './entities/working-paper.entity';
import { AuditWorkstream } from '../audit-engagements/entities/audit-workstream.entity';
import { DataSource } from 'typeorm';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QualityReviewsService } from '../quality-reviews/quality-reviews.service';
import { AuditMinutesService } from '../audit-findings/audit-minutes.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateWorkingPaperDto } from './dto/create-working-paper.dto';

describe('WorkingPapersService', () => {
  let service: WorkingPapersService;

  const mockWorkingPaperRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 1, ...dto })),
    save: jest
      .fn()
      .mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    }),
  };

  const mockWorkstreamRepo = {
    findOne: jest.fn().mockResolvedValue(null),
  };

  const mockDataSource = {
    query: jest.fn().mockResolvedValue([]),
    getRepository: jest.fn().mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
    }),
  };

  const mockAuditTrailService = {
    log: jest.fn().mockResolvedValue(true),
  };

  const mockNotificationsService = {
    create: jest.fn().mockResolvedValue(true),
  };

  const mockQualityReviewsService = {
    findByWorkingPaper: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 1 }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockAuditMinutesService = {
    collateFromWorkingPapers: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkingPapersService,
        {
          provide: getRepositoryToken(WorkingPaper),
          useValue: mockWorkingPaperRepo,
        },
        {
          provide: getRepositoryToken(AuditWorkstream),
          useValue: mockWorkstreamRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: AuditTrailService,
          useValue: mockAuditTrailService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: QualityReviewsService,
          useValue: mockQualityReviewsService,
        },
        {
          provide: AuditMinutesService,
          useValue: mockAuditMinutesService,
        },
      ],
    }).compile();

    service = module.get<WorkingPapersService>(WorkingPapersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a working paper and auto-assign creator information', async () => {
      const dto: any = {
        title: 'Kiểm toán quy trình cấp tín dụng thế chấp BĐS',
        type: 'Standard',
        domain: 'credit',
      };
      const user = {
        userId: 5,
        fullName: 'Auditor Le',
        username: 'le.auditor',
      };

      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        title: dto.title,
        status: 'Draft',
        creatorId: 5,
      });

      const result = await service.create(dto, user);

      expect(result).toBeDefined();
      expect(mockWorkingPaperRepo.create).toHaveBeenCalled();
      expect(mockWorkingPaperRepo.save).toHaveBeenCalled();
    });

    it('should inherit planName and reviewerId from engagement when provided', async () => {
      mockDataSource.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue({
          id: 10,
          name: 'Cuộc kiểm toán Chi nhánh HCM 2026',
          leadAuditorId: 99,
        }),
      });

      const dto: any = {
        title: 'Kiểm toán mẫu tín dụng',
        engagementId: 10,
      };

      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        planName: 'Cuộc kiểm toán Chi nhánh HCM 2026',
        reviewerId: 99,
      });

      const result = await service.create(dto);
      expect(mockWorkingPaperRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          planName: 'Cuộc kiểm toán Chi nhánh HCM 2026',
          reviewerId: 99,
        }),
      );
    });

    it('should pass DTO validation when type, reviewedBy and reviewedAt are provided with whitelist/forbidNonWhitelisted', async () => {
      const payload = {
        title:
          'Giấy tờ làm việc Kiểm toán Quy trình Cấp tín dụng & TSBĐ (40 Cột Thực tế)',
        referenceCode: 'WP-CREDIT-1234',
        domain: 'credit',
        planName: 'Kế hoạch kiểm toán tín dụng',
        engagementId: 1,
        creator: 'KTV Kiểm toán',
        objectives: 'Kiểm toán toàn diện',
        procedures: 'Kiểm tra hồ sơ',
        methodology: 'Vouching',
        sampleSelection: 'Phán đoán',
        riskDescription: 'Rủi ro thẩm định',
        conclusion: 'Đã kiểm tra',
        status: 'Draft',
        type: 'WP',
        reviewedBy: 'Trưởng đoàn',
        reviewedAt: new Date().toISOString(),
      };

      const dto = plainToInstance(CreateWorkingPaperDto, payload);
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      expect(errors).toHaveLength(0);
      expect(dto.type).toBe('WP');
      expect(dto.reviewedBy).toBe('Trưởng đoàn');
    });
  });

  describe('submitForReview', () => {
    it('should throw NotFoundException if working paper does not exist', async () => {
      mockWorkingPaperRepo.findOne.mockResolvedValue(null);

      await expect(service.submitForReview(999, { userId: 1 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if status is not Draft or Rework', async () => {
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        status: 'Approved',
      });

      await expect(service.submitForReview(1, { userId: 1 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should block submission if sample completion gate fails (untested samples > 0)', async () => {
      mockDataSource.query.mockResolvedValueOnce([
        { wpId: 1, total: '10', tested: '8', passed: '8', failed: '0' },
      ]);
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        status: 'Draft',
        creatorId: 5,
      });

      await expect(
        service.submitForReview(1, { userId: 5, role: 'Auditor' }),
      ).rejects.toThrow(/Còn 2\/10 mẫu chưa được kiểm tra/i);
    });

    it('should submit successfully, notify reviewer and initiate QAIP review', async () => {
      const mockWp: any = {
        id: 1,
        title: 'WP Kiểm toán Tín dụng',
        status: 'Draft',
        creatorId: 5,
        reviewerId: 10,
        sampleStats: { total: 10, untested: 0, tested: 10 },
        reviewHistory: [],
      };
      mockWorkingPaperRepo.findOne.mockResolvedValue(mockWp);

      const user = { userId: 5, fullName: 'Auditor Le', role: 'Auditor' };
      await service.submitForReview(1, user);

      expect(mockWorkingPaperRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'Submitted',
        }),
      );
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'REVIEW_REQUEST',
          recipientId: 10,
        }),
      );
      expect(mockQualityReviewsService.create).toHaveBeenCalled();
    });
  });

  describe('requestRework', () => {
    it('should throw BadRequestException if rework reason notes are empty', async () => {
      await expect(
        service.requestRework(1, '   ', { userId: 10, role: 'LeadAuditor' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if WP status is not Submitted', async () => {
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        status: 'Draft',
      });

      await expect(
        service.requestRework(1, 'Bổ sung mẫu', {
          userId: 10,
          role: 'LeadAuditor',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update status to Rework, record history, and notify creator', async () => {
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        title: 'WP Test',
        status: 'Submitted',
        creatorId: 5,
        reviewerId: 10,
        reviewHistory: [],
      });

      const user = {
        userId: 10,
        fullName: 'Lead Auditor',
        role: 'LeadAuditor',
      };
      await service.requestRework(1, 'Cần kiểm tra thêm 5 hợp đồng lớn', user);

      expect(mockWorkingPaperRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'Rework',
          reviewNotes: 'Cần kiểm tra thêm 5 hợp đồng lớn',
        }),
      );
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'REWORK',
          recipientId: 5,
        }),
      );
    });
  });

  describe('approve (Four-Eyes Principle)', () => {
    it('should enforce Four-Eyes principle: creator cannot self-approve working paper', async () => {
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        status: 'Submitted',
        creatorId: 5,
        reviewerId: 5, // Same user
      });

      const user = { userId: 5, fullName: 'Auditor Le', role: 'Auditor' };

      await expect(service.approve(1, 'Approved', user)).rejects.toThrow(
        /nguyên tắc 4 mắt/i,
      );
    });

    it('should approve successfully when reviewer is independent and samples are 100% complete', async () => {
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        title: 'WP Phê duyệt',
        status: 'Submitted',
        creatorId: 5,
        reviewerId: 10,
        sampleStats: { total: 5, untested: 0, tested: 5 },
        engagementId: 100,
        reviewHistory: [],
      });

      const approver = {
        userId: 10,
        fullName: 'Trưởng đoàn',
        role: 'LeadAuditor',
      };
      const result = await service.approve(1, 'Hồ sơ đạt yêu cầu', approver);

      expect(mockWorkingPaperRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'Approved',
          reviewerId: 10,
        }),
      );
    });
  });
});
