import { Test, TestingModule } from '@nestjs/testing';
import { AuditPlansService } from './audit-plans.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditPlan } from './entities/audit-plan.entity';
import { AuditPlanUnit } from './entities/audit-plan-unit.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';
import { AuditUniverse } from '../audit-universe/entities/audit-universe.entity';
import { User } from '../users/entities/user.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AuditPlansService', () => {
  let service: AuditPlansService;

  const mockAuditPlanRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 1, ...dto })),
    save: jest
      .fn()
      .mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    findOne: jest
      .fn()
      .mockImplementation(({ where }) =>
        Promise.resolve({ id: where?.id || 1, planUnits: [] }),
      ),
    findOneBy: jest
      .fn()
      .mockImplementation(({ id }) => Promise.resolve({ id, planUnits: [] })),
    find: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    }),
    manager: {
      getRepository: jest.fn().mockReturnValue({
        find: jest.fn().mockResolvedValue([]),
      }),
    },
  };

  const mockAuditPlanUnitRepo = {
    delete: jest.fn().mockResolvedValue({ affected: 0 }),
    save: jest.fn().mockImplementation((entities) => Promise.resolve(entities)),
  };

  const mockAuditEngagementRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((entity) => Promise.resolve({ id: 10, ...entity })),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockAuditUniverseRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditPlansService,
        {
          provide: getRepositoryToken(AuditPlan),
          useValue: mockAuditPlanRepo,
        },
        {
          provide: getRepositoryToken(AuditPlanUnit),
          useValue: mockAuditPlanUnitRepo,
        },
        {
          provide: getRepositoryToken(AuditEngagement),
          useValue: mockAuditEngagementRepo,
        },
        {
          provide: getRepositoryToken(AuditUniverse),
          useValue: mockAuditUniverseRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<AuditPlansService>(AuditPlansService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create and findOne', () => {
    it('should create and save an audit plan', async () => {
      const dto: any = { year: 2026, title: 'Kế hoạch kiểm toán năm 2026' };
      const result = await service.create(dto);

      expect(result).toBeDefined();
      expect(result.year).toBe(2026);
      expect(mockAuditPlanRepo.save).toHaveBeenCalled();
    });

    it('should find plan by id', async () => {
      mockAuditPlanRepo.findOneBy.mockResolvedValue({
        id: 1,
        title: 'Plan 2026',
      });

      const result = await service.findOne(1);
      expect(result).toEqual({ id: 1, title: 'Plan 2026' });
      expect(mockAuditPlanRepo.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });
  });

  describe('submitPlan', () => {
    it('should throw NotFoundException when plan does not exist', async () => {
      mockAuditPlanRepo.findOneBy.mockResolvedValue(null);

      await expect(service.submitPlan(99)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when a low risk unit has no justification', async () => {
      const mockPlan: any = {
        id: 1,
        status: 'Draft',
        year: 2026,
        selectedUnits: [
          {
            universeId: 10,
            name: 'Chi nhánh Hà Nội',
            riskLevel: 'Thấp',
            justification: '',
          },
        ],
      };
      mockAuditPlanRepo.findOneBy.mockResolvedValue(mockPlan);

      await expect(service.submitPlan(1)).rejects.toThrow(BadRequestException);
    });

    it('should transition status to PendingApproval and record submission history', async () => {
      const mockPlan: any = {
        id: 1,
        status: 'Draft',
        year: 2026,
        selectedUnits: [
          {
            universeId: 10,
            name: 'Chi nhánh Hà Nội',
            riskLevel: 'Thấp',
            justification: 'Đơn vị luân chuyển lãnh đạo',
          },
        ],
        approvalHistory: [],
      };
      mockAuditPlanRepo.findOneBy.mockResolvedValue(mockPlan);
      mockAuditPlanRepo.save.mockImplementation((p) => Promise.resolve(p));

      // Mock manager getRepository for coverage calculation
      mockAuditPlanRepo.manager.getRepository.mockReturnValue({
        find: jest.fn().mockResolvedValue([]),
      });

      const result = await service.submitPlan(1);

      expect(result.status).toBe('PendingApproval');
      expect(result.approvalHistory).toHaveLength(1);
      expect(result.approvalHistory[0].action).toBe('SUBMIT');
    });
  });

  describe('approveL1 and approveL2 (Multi-tier Approval Workflow)', () => {
    it('should approve L1 when plan is PendingApproval', async () => {
      const mockPlan: any = {
        id: 1,
        status: 'PendingApproval',
        approvalHistory: [],
      };
      mockAuditPlanRepo.findOneBy.mockResolvedValue(mockPlan);
      mockAuditPlanRepo.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.approveL1(
        1,
        10,
        'Trưởng phòng KTNB',
        'Đã soát xét đầy đủ',
      );

      expect(result.status).toBe('Reviewed_L1');
      expect(result.reviewerL1Id).toBe(10);
      expect(result.reviewerL1Name).toBe('Trưởng phòng KTNB');
    });

    it('should reject approveL1 if status is not Draft or PendingApproval', async () => {
      const mockPlan: any = { id: 1, status: 'Approved' };
      mockAuditPlanRepo.findOneBy.mockResolvedValue(mockPlan);

      await expect(service.approveL1(1, 10, 'Trưởng phòng')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should enforce Four-Eyes principle: L1 reviewer cannot approve L2', async () => {
      const mockPlan: any = {
        id: 1,
        status: 'Reviewed_L1',
        reviewerL1Id: 10,
      };
      mockAuditPlanRepo.findOneBy.mockResolvedValue(mockPlan);

      await expect(
        service.approveL2(1, 10, 'Trưởng phòng kiêm Trưởng ban'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully approve L2 when approved by an independent approver', async () => {
      const mockPlan: any = {
        id: 1,
        status: 'Reviewed_L1',
        reviewerL1Id: 10,
        year: 2026,
        selectedUnits: [],
        approvalHistory: [],
      };
      mockAuditPlanRepo.findOneBy.mockResolvedValue(mockPlan);
      mockAuditPlanRepo.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.approveL2(
        1,
        20,
        'Trưởng Ban KTNB',
        'Phê duyệt ban hành',
      );

      expect(result.status).toBe('Approved');
      expect(result.approverL2Id).toBe(20);
      expect(mockCacheManager.del).toHaveBeenCalled();
    });
  });

  describe('rejectPlan', () => {
    it('should set status back to Draft and increment revisionCount', async () => {
      const mockPlan: any = {
        id: 1,
        status: 'Reviewed_L1',
        revisionCount: 0,
        approvalHistory: [],
      };
      mockAuditPlanRepo.findOneBy.mockResolvedValue(mockPlan);
      mockAuditPlanRepo.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.rejectPlan(
        1,
        20,
        'Cần bổ sung phạm vi IT',
        'Trưởng Ban',
      );

      expect(result.status).toBe('Draft');
      expect(result.revisionCount).toBe(1);
      expect(result.approvalHistory[0].action).toBe('REWORK');
    });
  });
});
