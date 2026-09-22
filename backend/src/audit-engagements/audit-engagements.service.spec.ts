import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditEngagementsService } from './audit-engagements.service';
import { AuditEngagement } from './entities/audit-engagement.entity';
import { AuditWorkstream } from './entities/audit-workstream.entity';
import { AuditSchedule } from '../audit-schedules/entities/audit-schedule.entity';
import { WorkingPaper } from '../working-papers/entities/working-paper.entity';
import { EngagementChangeRequest } from './entities/engagement-change-request.entity';
import { IndependenceService } from '../independence/independence.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('AuditEngagementsService', () => {
  let service: AuditEngagementsService;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest
      .fn()
      .mockResolvedValue([
        { id: 1, name: 'Cuộc kiểm toán Tín dụng 2026', status: 'InExecution' },
      ]),
  };

  const mockRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 1, ...dto })),
    save: jest
      .fn()
      .mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockWorkstreamRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 10, ...dto })),
    save: jest
      .fn()
      .mockImplementation((entity) => Promise.resolve({ id: 10, ...entity })),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockScheduleRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((entity) => Promise.resolve({ id: 20, ...entity })),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockWorkingPaperRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
  };

  const mockChangeRequestRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((entity) => Promise.resolve({ id: 30, ...entity })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditEngagementsService,
        { provide: getRepositoryToken(AuditEngagement), useValue: mockRepo },
        {
          provide: getRepositoryToken(AuditWorkstream),
          useValue: mockWorkstreamRepo,
        },
        {
          provide: getRepositoryToken(AuditSchedule),
          useValue: mockScheduleRepo,
        },
        {
          provide: getRepositoryToken(WorkingPaper),
          useValue: mockWorkingPaperRepo,
        },
        {
          provide: getRepositoryToken(EngagementChangeRequest),
          useValue: mockChangeRequestRepo,
        },
        {
          provide: IndependenceService,
          useValue: {
            checkAuditorIndependence: jest.fn().mockResolvedValue({ isIndependent: true }),
            assessTeamIndependence: jest.fn().mockResolvedValue({ isCompliant: true }),
          },
        },
      ],
    }).compile();

    service = module.get<AuditEngagementsService>(AuditEngagementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a new engagement', async () => {
      const dto = { name: 'Kiểm toán Huy động vốn', status: 'Planning' };
      const result = await service.create(dto);

      expect(mockRepo.create).toHaveBeenCalledWith({
        ...dto,
        isExpectedInfo: false,
        legacyAuditedDepartment: undefined,
        legacyLeadAuditor: undefined,
        legacyPlanName: undefined,
      });
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 1);
      expect(result.name).toBe('Kiểm toán Huy động vốn');
    });
  });

  describe('findAll', () => {
    it('should query engagements with admin role without restricting by department', async () => {
      const user = { userId: 1, role: 'Admin' };
      const results = await service.findAll(user);

      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('eng');
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
      expect(results).toHaveLength(1);
    });

    it('should apply department filter for auditee user', async () => {
      const user = {
        userId: 5,
        role: 'Auditee',
        legacyDepartment: 'Chi nhánh Hà Nội',
      };
      await service.findAll(user);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'eng.legacyAuditedDepartment = :dept',
        { dept: 'Chi nhánh Hà Nội' },
      );
    });
  });

  describe('findOne', () => {
    it('should return engagement with workstreams', async () => {
      const mockEngagement = { id: 1, name: 'CTKT 1', workstreams: [] };
      mockRepo.findOne.mockResolvedValue(mockEngagement);

      const result = await service.findOne(1);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: [
          'workstreams',
          'leadAuditorUser',
          'plan',
          'auditedDepartment',
        ],
      });
      expect(result).toEqual({
        ...mockEngagement,
        auditedDepartment: '',
        leadAuditor: '',
        planName: '',
      });
    });
  });

  describe('createFromRiskAssessment', () => {
    it('should return null for Low or Medium risk assessment', async () => {
      const lowRiskAssessment = { id: 99, riskLevel: 'Low' };
      const result = await service.createFromRiskAssessment(lowRiskAssessment);
      expect(result).toBeNull();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('should create engagement for High risk assessment', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const highRiskAssessment = {
        id: 101,
        riskLevel: 'High',
        legacyDepartment: 'Khối CNTT',
        residualRiskScore: 16,
        auditCategory: 'Công nghệ thông tin',
      };

      const result = await service.createFromRiskAssessment(highRiskAssessment);
      expect(mockRepo.create).toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('reviewWorkstream (Four-Eyes Gate)', () => {
    it('should throw NotFoundException if workstream not found', async () => {
      mockWorkstreamRepo.findOne.mockResolvedValue(null);
      await expect(
        service.reviewWorkstream(999, { status: 'Reviewed' }, { role: 'admin' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not lead auditor and not privileged', async () => {
      const mockWs = { id: 10, engagementId: 1 };
      mockWorkstreamRepo.findOne.mockResolvedValue(mockWs);
      mockRepo.findOne.mockResolvedValue({ id: 1, leadAuditorId: 5 });

      await expect(
        service.reviewWorkstream(10, { status: 'Reviewed' }, { userId: 99, role: 'KTV' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update status to Rework with reviewNotes', async () => {
      const mockWs = { id: 10, engagementId: 1, status: 'Completed' };
      mockWorkstreamRepo.findOne.mockResolvedValue(mockWs);
      mockRepo.findOne.mockResolvedValue({ id: 1, leadAuditorId: 5 });

      await service.reviewWorkstream(
        10,
        { status: 'Rework', reviewNotes: 'Thiếu bằng chứng kiểm tra mẫu' },
        { userId: 5, role: 'lead_auditor' }
      );

      expect(mockWorkstreamRepo.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          status: 'Rework',
          reviewNotes: 'Thiếu bằng chứng kiểm tra mẫu',
        })
      );
    });

    it('should update status to Reviewed with reviewedAt and reviewNotes', async () => {
      const mockWs = { id: 10, engagementId: 1, status: 'Completed' };
      mockWorkstreamRepo.findOne.mockResolvedValue(mockWs);
      mockRepo.findOne.mockResolvedValue({ id: 1, leadAuditorId: 5 });

      await service.reviewWorkstream(
        10,
        { status: 'Reviewed', reviewNotes: 'Đã soát xét đạt' },
        { userId: 5, role: 'lead_auditor' }
      );

      expect(mockWorkstreamRepo.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          status: 'Reviewed',
          reviewNotes: 'Đã soát xét đạt',
          reviewedAt: expect.any(Date),
        })
      );
    });
  });
});
