import { Test, TestingModule } from '@nestjs/testing';
import { AuditCommitteeService } from './audit-committee.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditCharterService } from '../audit-charter/audit-charter.service';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { AuditUniverse } from '../audit-universe/entities/audit-universe.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';
import { AnnualControlAssessment } from './entities/annual-control-assessment.entity';
import { ExecutiveSession } from './entities/executive-session.entity';
import { ExternalAssuranceCoordination } from './entities/external-assurance-coordination.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AuditCommitteeService', () => {
  let service: AuditCommitteeService;

  const mockAuditCharterService = {
    getCharters: jest.fn().mockResolvedValue([{ id: 1, version: 'v2026.1', title: 'Default Charter' }]),
    createCharter: jest.fn().mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
    updateCharterStatus: jest.fn().mockImplementation((id, status, username) => Promise.resolve({ id, status, approvedBy: username })),
  };

  const createMockQueryBuilder = (resultList: any[] = []) => ({
    andWhere: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(resultList),
    getRawMany: jest.fn().mockResolvedValue(resultList),
  });

  let mockUniverseQueryBuilder: any;
  let mockEngagementQueryBuilder: any;
  let mockFindingQueryBuilder: any;

  const mockUniverseRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockEngagementRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockFindingRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockAnnualAssessmentRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
  };

  const mockExecSessionRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
  };

  const mockExtAssuranceRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockUniverseQueryBuilder = createMockQueryBuilder([]);
    mockEngagementQueryBuilder = createMockQueryBuilder([]);
    mockFindingQueryBuilder = createMockQueryBuilder([]);

    mockUniverseRepo.createQueryBuilder.mockReturnValue(
      mockUniverseQueryBuilder,
    );
    mockEngagementRepo.createQueryBuilder.mockReturnValue(
      mockEngagementQueryBuilder,
    );
    mockFindingRepo.createQueryBuilder.mockReturnValue(mockFindingQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditCommitteeService,
        {
          provide: AuditCharterService,
          useValue: mockAuditCharterService,
        },
        {
          provide: getRepositoryToken(AuditFinding),
          useValue: mockFindingRepo,
        },
        {
          provide: getRepositoryToken(AuditUniverse),
          useValue: mockUniverseRepo,
        },
        {
          provide: getRepositoryToken(AuditEngagement),
          useValue: mockEngagementRepo,
        },
        {
          provide: getRepositoryToken(AnnualControlAssessment),
          useValue: mockAnnualAssessmentRepo,
        },
        {
          provide: getRepositoryToken(ExecutiveSession),
          useValue: mockExecSessionRepo,
        },
        {
          provide: getRepositoryToken(ExternalAssuranceCoordination),
          useValue: mockExtAssuranceRepo,
        },
      ],
    }).compile();

    service = module.get<AuditCommitteeService>(AuditCommitteeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCharters', () => {
    it('should delegate to auditCharterService.getCharters', async () => {
      const result = await service.getCharters();
      expect(mockAuditCharterService.getCharters).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].version).toBe('v2026.1');
    });
  });

  describe('createCharter', () => {
    it('should delegate to auditCharterService.createCharter', async () => {
      const dto = { title: 'New Charter', version: 'v2026.2' };
      const result = await service.createCharter(dto);

      expect(mockAuditCharterService.createCharter).toHaveBeenCalledWith(dto);
      expect(result.title).toBe(dto.title);
    });
  });

  describe('updateCharterStatus', () => {
    it('should delegate to auditCharterService.updateCharterStatus', async () => {
      const result = await service.updateCharterStatus(
        1,
        'Approved',
        'super_admin',
      );
      expect(mockAuditCharterService.updateCharterStatus).toHaveBeenCalledWith(
        1,
        'Approved',
        'super_admin',
      );
      expect(result.status).toBe('Approved');
      expect(result.approvedBy).toBe('super_admin');
    });
  });

  describe('get3LoDStats', () => {
    it('should calculate 3LoD stats with filtered parameters', async () => {
      mockUniverseQueryBuilder.getMany.mockResolvedValue([
        { id: 1, lineOfDefense: 1 },
        { id: 2, lineOfDefense: 2 },
        { id: 3, lineOfDefense: 3 },
      ]);
      mockEngagementQueryBuilder.getMany.mockResolvedValue([
        { id: 10, status: 'Completed' },
        { id: 11, status: 'Completed' },
      ]);
      mockFindingQueryBuilder.getMany.mockResolvedValue([
        { id: 101, riskLevel: 'Low' },
        { id: 102, riskLevel: 'High' },
        { id: 103, riskLevel: 'Critical' },
      ]);

      const stats = await service.get3LoDStats('D01', '2026', 'Universe_A');
      expect(stats.line1.name).toContain('Tuyến 1');
      expect(stats.line1.issues).toBe(1);
      expect(stats.line2.issues).toBe(1);
      expect(stats.line3.issues).toBe(1);
      expect(mockUniverseQueryBuilder.andWhere).toHaveBeenCalled();
      expect(mockEngagementQueryBuilder.andWhere).toHaveBeenCalled();
      expect(mockFindingQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('getCommitteeHighlights', () => {
    it('should return highlight metrics for Audit Committee', async () => {
      mockFindingQueryBuilder.getMany.mockResolvedValue([
        { id: 1, riskLevel: 'Critical' },
        { id: 2, riskLevel: 'Critical' },
        { id: 3, riskLevel: 'High' },
        { id: 4, riskLevel: 'Low' },
      ]);

      const highlights = await service.getCommitteeHighlights('D01', '2026');
      expect(highlights.criticalFindings).toBe(2);
      expect(highlights.highFindings).toBe(1);
      expect(highlights.totalIssues).toBe(3);
      expect(highlights.lastUpdate).toBeInstanceOf(Date);
    });
  });

  describe('Annual Control Assessment (Thông tư 13 Điều 65 & IIA Standard 11.3)', () => {
    it('should list annual assessments', async () => {
      mockAnnualAssessmentRepo.find.mockResolvedValue([{ id: 1, year: 2026 }]);
      const res = await service.getAnnualAssessments(2026);
      expect(res).toHaveLength(1);
      expect(mockAnnualAssessmentRepo.find).toHaveBeenCalledWith({
        where: { year: 2026 },
        order: { year: 'DESC' },
      });
    });

    it('should get single assessment', async () => {
      mockAnnualAssessmentRepo.findOne.mockResolvedValue({ id: 1, year: 2026 });
      const res = await service.getAnnualAssessment(1);
      expect(res.id).toBe(1);
    });

    it('should throw NotFoundException if assessment not found', async () => {
      mockAnnualAssessmentRepo.findOne.mockResolvedValue(null);
      await expect(service.getAnnualAssessment(99)).rejects.toThrow(NotFoundException);
    });

    it('should create annual assessment in Draft status', async () => {
      const dto = { year: 2026, title: 'Báo cáo KSNB 2026', overallOpinion: 'Effective' };
      const user = { userId: 10, fullName: 'Trưởng Ban KTNB' };
      const res = await service.createAnnualAssessment(dto, user);
      expect(mockAnnualAssessmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ year: 2026, status: 'Draft', preparedById: 10 }),
      );
      expect(res.id).toBe(1);
    });

    it('should approve annual assessment with BKS notes', async () => {
      mockAnnualAssessmentRepo.findOne.mockResolvedValue({
        id: 1,
        status: 'Draft',
      });

      const user = { userId: 99, fullName: 'Trưởng BKS' };
      const res = await service.approveAnnualAssessment(1, 'BKS nhất trí thông qua', user);
      expect(res.status).toBe('ApprovedByBks');
      expect(res.approvedByBksId).toBe(99);
      expect(res.bksOpinionNotes).toBe('BKS nhất trí thông qua');
      expect(mockAnnualAssessmentRepo.save).toHaveBeenCalled();
    });
  });

  describe('Executive Sessions (IIA Standard 2.2 & Thông tư 13 Điều 60)', () => {
    it('should list executive sessions', async () => {
      mockExecSessionRepo.find.mockResolvedValue([{ id: 1, title: 'Phiên họp kín Q2' }]);
      const res = await service.getExecutiveSessions(2026);
      expect(res).toHaveLength(1);
    });

    it('should create executive session with hasManagementPresent=false', async () => {
      const dto = { title: 'Phiên họp kín Q2', meetingDate: '2026-06-15', year: 2026 };
      const user = { userId: 5, fullName: 'CAE' };
      const res = await service.createExecutiveSession(dto, user);
      expect(mockExecSessionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ hasManagementPresent: false }),
      );
      expect(res.id).toBe(1);
    });

    it('should record minutes and action items for executive session', async () => {
      mockExecSessionRepo.findOne.mockResolvedValue({ id: 1, status: 'Scheduled' });
      const actionItems = [{ directive: 'Rà soát hạn mức tín dụng', assignee: 'CAE', dueDate: '2026-07-01', status: 'Open' }];

      const res = await service.minuteExecutiveSession(
        1,
        'BKS chỉ đạo tập trung kiểm toán danh mục nợ nhóm 2',
        actionItems,
        { userId: 5, fullName: 'CAE' },
      );
      expect(res.status).toBe('Minuted');
      expect(res.minutesSummary).toContain('danh mục nợ nhóm 2');
      expect(res.actionItems).toEqual(actionItems);
    });
  });

  describe('External Assurance Coordination (IIA Standard 9.5 & Basel BCBS)', () => {
    it('should list coordinations', async () => {
      mockExtAssuranceRepo.find.mockResolvedValue([{ id: 1, partyName: 'PwC Việt Nam' }]);
      const res = await service.getCoordinations(2026);
      expect(res).toHaveLength(1);
    });

    it('should create coordination record with external assurance provider', async () => {
      const dto = {
        partyType: 'ExternalAuditor',
        partyName: 'PwC Việt Nam',
        auditYear: 2026,
        engagementTitle: 'Kiểm toán BCTC 2026',
        relianceLevel: 'High',
      };

      const res = await service.createCoordination(dto);
      expect(mockExtAssuranceRepo.create).toHaveBeenCalledWith(dto);
      expect(res.id).toBe(1);
    });

    it('should delete coordination record', async () => {
      mockExtAssuranceRepo.findOne.mockResolvedValue({ id: 1 });
      await service.deleteCoordination(1);
      expect(mockExtAssuranceRepo.remove).toHaveBeenCalled();
    });
  });
});
