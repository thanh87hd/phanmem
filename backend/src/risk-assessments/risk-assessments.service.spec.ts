import { Test, TestingModule } from '@nestjs/testing';
import { RiskAssessmentsService } from './risk-assessments.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RiskAssessment } from './entities/risk-assessment.entity';
import { RiskApproval } from './entities/risk-approval.entity';
import { RiskSnapshot } from './entities/risk-snapshot.entity';
import { RiskAuditLog } from './entities/risk-audit-log.entity';
import { EntityManager } from 'typeorm';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditEngagementsService } from '../audit-engagements/audit-engagements.service';
import { UnifiedRiskEngineService } from './unified-risk-engine.service';

const mockRepo = {
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  findOneBy: jest.fn().mockResolvedValue(null),
  save: jest
    .fn()
    .mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
  create: jest.fn().mockImplementation((dto) => ({ id: 1, ...dto })),
  createQueryBuilder: jest.fn(() => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  })),
};

describe('RiskAssessmentsService', () => {
  let service: RiskAssessmentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskAssessmentsService,
        UnifiedRiskEngineService,
        { provide: getRepositoryToken(RiskAssessment), useValue: mockRepo },
        { provide: getRepositoryToken(RiskApproval), useValue: mockRepo },
        { provide: getRepositoryToken(RiskSnapshot), useValue: mockRepo },
        { provide: getRepositoryToken(RiskAuditLog), useValue: mockRepo },
        {
          provide: EntityManager,
          useValue: { getRepository: jest.fn(() => mockRepo) },
        },
        { provide: NotificationsService, useValue: { create: jest.fn() } },
        { provide: AuditEngagementsService, useValue: { findOne: jest.fn() } },
      ],
    }).compile();

    service = module.get<RiskAssessmentsService>(RiskAssessmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should find all risk assessments with default filters', async () => {
    const result = await service.findAll({});
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should calculate summary statistics properly', async () => {
    mockRepo.find.mockResolvedValueOnce([
      { id: 1, riskLevel: 'Critical', status: 'Approved', totalScore: 85 },
      { id: 2, riskLevel: 'High', status: 'Approved', totalScore: 70 },
      { id: 3, riskLevel: 'Medium', status: 'Draft', totalScore: 50 },
    ]);
    const summary = await service.getSummaryStats();
    expect(summary).toBeDefined();
    expect(summary.total).toBe(3);
    expect(summary.approved).toBe(2);
    expect(summary.draft).toBe(1);
  });
});
