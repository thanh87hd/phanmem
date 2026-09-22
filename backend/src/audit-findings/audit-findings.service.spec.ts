import { Test, TestingModule } from '@nestjs/testing';
import { AuditFindingsService } from './audit-findings.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditFinding } from './entities/audit-finding.entity';
import { AuditWorkstream } from '../audit-engagements/entities/audit-workstream.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import { WorkflowsService } from '../workflows/workflows.service';

describe('AuditFindingsService', () => {
  let service: AuditFindingsService;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getMany: jest.fn().mockResolvedValue([]),
    getOne: jest.fn().mockResolvedValue(null),
  };

  const mockAuditFindingRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 1, ...dto })),
    save: jest
      .fn()
      .mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    manager: {
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      }),
    },
  };

  const mockWorkstreamRepo = {
    findOne: jest.fn(),
  };

  const mockRecommendationRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((entity) => Promise.resolve({ id: 10, ...entity })),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockWorkflowsService = {
    triggerEvent: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditFindingsService,
        {
          provide: getRepositoryToken(AuditFinding),
          useValue: mockAuditFindingRepo,
        },
        {
          provide: getRepositoryToken(AuditWorkstream),
          useValue: mockWorkstreamRepo,
        },
        {
          provide: getRepositoryToken(Recommendation),
          useValue: mockRecommendationRepo,
        },
        {
          provide: WorkflowsService,
          useValue: mockWorkflowsService,
        },
      ],
    }).compile();

    service = module.get<AuditFindingsService>(AuditFindingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateFindingCode', () => {
    it('should generate default finding code when no engagement or workstream provided', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      const currentYear = new Date().getFullYear();

      const code = await service.generateFindingCode();

      expect(code).toBe(`FD-${currentYear}-GEN-GEN-001`);
    });

    it('should generate specific finding code based on engagement branch and credit workstream', async () => {
      mockAuditFindingRepo.manager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue({
          id: 101,
          branchCode: 'HCM',
          plan: { year: 2026 },
        }),
      });

      mockWorkstreamRepo.findOne.mockResolvedValue({
        id: 202,
        title: 'Quy trình Cho vay Khách hàng Cá nhân (Tín dụng)',
      });

      mockQueryBuilder.getCount.mockResolvedValue(2);

      const code = await service.generateFindingCode(101, 202);

      expect(code).toBe('FD-2026-HCM-TD-003');
    });

    it('should generate code for IT workstream', async () => {
      mockAuditFindingRepo.manager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue({
          id: 102,
          branchCode: 'DANANG',
          plan: { year: 2026 },
        }),
      });

      mockWorkstreamRepo.findOne.mockResolvedValue({
        id: 203,
        title: 'Hệ thống Công nghệ Thông tin và Bảo mật',
      });

      mockQueryBuilder.getCount.mockResolvedValue(0);

      const code = await service.generateFindingCode(102, 203);

      expect(code).toBe('FD-2026-DANANG-IT-001');
    });
  });

  describe('create', () => {
    it('should auto-generate findingCode and set reportedByAuditorId from user context', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const createDto: any = {
        title: 'Hồ sơ tín dụng thiếu chứng từ chứng minh thu nhập',
        riskLevel: 'High',
        engagementId: 1,
      };

      const user = { userId: 5, fullName: 'Auditor Nguyen' };

      const result = await service.create(createDto, user);

      expect(result).toBeDefined();
      expect(result.findingCode).toContain('FD-');
      expect(result.reportedByAuditorId).toBe(5);
      expect(mockAuditFindingRepo.save).toHaveBeenCalled();
    });

    it('should preserve provided findingCode if already supplied', async () => {
      const createDto: any = {
        findingCode: 'FD-CUSTOM-001',
        title: 'Sai lệch tiền mặt kiểm kê quỹ',
        riskLevel: 'Medium',
      };

      const result = await service.create(createDto);

      expect(result.findingCode).toBe('FD-CUSTOM-001');
    });
  });

  describe('findAll', () => {
    it('should return findings with relations for admin user', async () => {
      const mockFindings = [
        { id: 1, findingCode: 'FD-2026-GEN-GEN-001', title: 'Finding 1' },
        { id: 2, findingCode: 'FD-2026-GEN-GEN-002', title: 'Finding 2' },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(mockFindings);

      const user = { userId: 1, role: 'Admin' };
      const results = await service.findAll(user);

      expect(results).toEqual(mockFindings);
      expect(mockAuditFindingRepo.createQueryBuilder).toHaveBeenCalledWith(
        'finding',
      );
    });

    it('should filter by engagementId when provided', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll({ userId: 1, role: 'Admin' }, 42);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'finding.engagementId = :engagementId',
        { engagementId: 42 },
      );
    });
  });
});
