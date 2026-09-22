import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditRatingService } from './audit-rating.service';
import { AuditRating } from './entities/audit-rating.entity';

describe('AuditRatingService', () => {
  let service: AuditRatingService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 1, ...entity })),
      findOne: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditRatingService,
        { provide: getRepositoryToken(AuditRating), useValue: repo },
      ],
    }).compile();

    service = module.get<AuditRatingService>(AuditRatingService);
  });

  it('should compute Satisfactory for low risk and effective controls without issues', () => {
    const res = service.computeRating({
      residualRiskScore: 1.2,
      controlEffectivenessScore: 1.2,
      criticalIssuesCount: 0,
      highIssuesCount: 0,
      moderateIssuesCount: 1,
      coverageGapPct: 0.02,
      managementResponseScore: 1.0,
    });

    expect(res.baseWeightedScore).toBeLessThanOrEqual(1.75);
    expect(res.calculatedRating).toBe('Satisfactory');
    expect(res.finalRating).toBe('Satisfactory');
  });

  it('should trigger Hard Rule 1: 1 Critical issue floors at Needs Improvement', () => {
    const res = service.computeRating({
      residualRiskScore: 1.2,
      controlEffectivenessScore: 1.2,
      criticalIssuesCount: 1,
      highIssuesCount: 0,
      coverageGapPct: 0,
      managementResponseScore: 1.0,
    });

    expect(res.decisionRuleRating).toBe('Needs Improvement');
    expect(res.finalRating).toBe('Needs Improvement');
    expect(res.decisionRuleRationale).toContain('Quy tắc 1');
  });

  it('should trigger Hard Rule 1: >= 2 Critical issues forces Unsatisfactory', () => {
    const res = service.computeRating({
      residualRiskScore: 1.5,
      controlEffectivenessScore: 1.5,
      criticalIssuesCount: 2,
      highIssuesCount: 1,
      coverageGapPct: 0,
      managementResponseScore: 1.0,
    });

    expect(res.decisionRuleRating).toBe('Unsatisfactory');
    expect(res.finalRating).toBe('Unsatisfactory');
  });

  it('should trigger Hard Rule 2: >= 3 High issues floors at Needs Improvement', () => {
    const res = service.computeRating({
      residualRiskScore: 1.4,
      controlEffectivenessScore: 1.4,
      criticalIssuesCount: 0,
      highIssuesCount: 3,
      coverageGapPct: 0.02,
      managementResponseScore: 1.0,
    });

    expect(res.decisionRuleRating).toBe('Needs Improvement');
    expect(res.decisionRuleRationale).toContain('Quy tắc 2');
  });

  it('should trigger Hard Rule 3: Severe Scope Limitation forces Unsatisfactory', () => {
    const res = service.computeRating({
      residualRiskScore: 1.2,
      controlEffectivenessScore: 1.2,
      criticalIssuesCount: 0,
      highIssuesCount: 0,
      scopeLimitation: 'Severe',
    });

    expect(res.finalRating).toBe('Unsatisfactory');
    expect(res.decisionRuleRationale).toContain('Quy tắc 3');
  });

  it('should trigger Hard Rule 5: Coverage gap > 30% downgrades by 1 tier', () => {
    // Base score would be Satisfactory, but gap > 30% drops it to Generally Satisfactory
    const res = service.computeRating({
      residualRiskScore: 1.2,
      controlEffectivenessScore: 1.2,
      criticalIssuesCount: 0,
      highIssuesCount: 0,
      coverageGapPct: 0.35,
    });

    expect(res.calculatedRating).toBe('Satisfactory');
    expect(res.finalRating).toBe('Generally Satisfactory');
    expect(res.decisionRuleRationale).toContain('Quy tắc 5');
  });
});
