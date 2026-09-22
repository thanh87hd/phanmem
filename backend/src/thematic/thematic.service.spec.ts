import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ThematicService } from './thematic.service';
import { ThematicTheme } from './entities/thematic-theme.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { RiskRegister } from '../risk-register/entities/risk-register.entity';

describe('ThematicService', () => {
  let service: ThematicService;

  const mockThemes: Partial<ThematicTheme>[] = [
    {
      id: 1,
      themeId: 'TH-2026-001',
      themeTitle: 'Quản trị phân quyền PAM',
      riskDomainCode: 'CNTT',
      themePriority: 'Critical',
      riskTrajectory: 'Increasing',
      status: 'Approved',
      issueIds: ['ISS-01', 'ISS-02'],
      riskIds: ['RISK-01'],
      systemicRootCause: 'Thiếu kiểm soát phân quyền tập trung',
    },
    {
      id: 2,
      themeId: 'TH-2026-002',
      themeTitle: 'Tuân thủ điều kiện giải ngân',
      riskDomainCode: 'TD_DVKD',
      themePriority: 'High',
      riskTrajectory: 'Stable',
      status: 'In_Progress',
      issueIds: ['ISS-03'],
      riskIds: ['RISK-02'],
      systemicRootCause: 'Áp lực chỉ tiêu tăng trưởng',
    },
  ];

  const mockThemeRepo = {
    find: jest.fn().mockResolvedValue(mockThemes),
    findOne: jest
      .fn()
      .mockImplementation(({ where: { id } }) =>
        Promise.resolve(mockThemes.find((t) => t.id === id) || null),
      ),
    count: jest.fn().mockResolvedValue(2),
    create: jest.fn().mockImplementation((dto) => ({ id: 3, ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    remove: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn().mockReturnValue({
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(mockThemes),
    }),
  };

  const mockFindingRepo = {
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 1,
          findingCode: 'FD-001',
          findingCategory: 'CNTT',
          violationHistory: 'Hệ thống',
          repeatCount: 2,
          cause: 'Lỗi cấu hình',
          riskLevel: 'Critical',
        },
      ]),
    }),
  };

  const mockRiskRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThematicService,
        {
          provide: getRepositoryToken(ThematicTheme),
          useValue: mockThemeRepo,
        },
        {
          provide: getRepositoryToken(AuditFinding),
          useValue: mockFindingRepo,
        },
        {
          provide: getRepositoryToken(RiskRegister),
          useValue: mockRiskRepo,
        },
      ],
    }).compile();

    service = module.get<ThematicService>(ThematicService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should compute getDashboard metrics properly', async () => {
    const dash = await service.getDashboard();
    expect(dash.totalThemes).toBe(2);
    expect(dash.priorityCounts.Critical).toBe(1);
    expect(dash.priorityCounts.High).toBe(1);
    expect(dash.trajectoryCounts.Increasing).toBe(1);
    expect(dash.trajectoryCounts.Stable).toBe(1);
    expect(dash.totalLinkedIssues).toBe(3); // 2 + 1
    expect(dash.totalLinkedRisks).toBe(2); // 1 + 1
    expect(dash.topCauses.length).toBe(2);
  });

  it('should find themes with query builder', async () => {
    const res = await service.findAll({ domain: 'CNTT', priority: 'Critical' });
    expect(res.length).toBe(2);
    expect(mockThemeRepo.createQueryBuilder).toHaveBeenCalled();
  });

  it('should auto-detect systemic clusters from findings', async () => {
    const auto = await service.autoDetectThemes();
    expect(auto.totalSystemicFindings).toBe(1);
    expect(auto.clusters.length).toBe(1);
    expect(auto.clusters[0].proposedDomain).toBe('CNTT');
    expect(auto.clusters[0].proposedPriority).toBe('High');
  });

  it('should create a new theme', async () => {
    const newTheme = await service.create({
      themeId: 'TH-2026-005',
      themeTitle: 'Test Theme',
      riskDomainCode: 'NHBL',
    });
    expect(newTheme.themeId).toBe('TH-2026-005');
  });
});
