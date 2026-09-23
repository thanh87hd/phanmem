import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RiskPlanningService } from './risk-planning.service';
import { RiskAssessment } from './entities/risk-assessment.entity';
import { RiskProfile } from './entities/risk-profile.entity';
import { RcsaAssessment } from './entities/rcsa-assessment.entity';
import { AuditUniverse } from '../audit-universe/entities/audit-universe.entity';
import { Department } from '../departments/entities/department.entity';
import { RiskControlMatrix } from '../risk-control-matrix/entities/risk-control-matrix.entity';
import { RiskRegister } from '../risk-register/entities/risk-register.entity';
import { AuditPlan } from '../audit-plans/entities/audit-plan.entity';
import { AuditPlanUnit } from '../audit-plans/entities/audit-plan-unit.entity';
import { ResourceDemand } from '../resource-capacity/entities/resource-demand.entity';
import { StaffRoster } from '../resource-capacity/entities/staff-roster.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { MonitoringAlert } from '../continuous-monitoring/entities/monitoring-alert.entity';

describe('RiskPlanningService', () => {
  let service: RiskPlanningService;

  const mockRepo = () => ({
    count: jest.fn().mockResolvedValue(0),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue({ totalHours: 0 }),
    }),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskPlanningService,
        { provide: getRepositoryToken(RiskAssessment), useFactory: mockRepo },
        { provide: getRepositoryToken(RiskProfile), useFactory: mockRepo },
        { provide: getRepositoryToken(RcsaAssessment), useFactory: mockRepo },
        { provide: getRepositoryToken(AuditUniverse), useFactory: mockRepo },
        { provide: getRepositoryToken(Department), useFactory: mockRepo },
        { provide: getRepositoryToken(RiskControlMatrix), useFactory: mockRepo },
        { provide: getRepositoryToken(RiskRegister), useFactory: mockRepo },
        { provide: getRepositoryToken(AuditPlan), useFactory: mockRepo },
        { provide: getRepositoryToken(AuditPlanUnit), useFactory: mockRepo },
        { provide: getRepositoryToken(ResourceDemand), useFactory: mockRepo },
        { provide: getRepositoryToken(StaffRoster), useFactory: mockRepo },
        { provide: getRepositoryToken(AuditFinding), useFactory: mockRepo },
        { provide: getRepositoryToken(MonitoringAlert), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<RiskPlanningService>(RiskPlanningService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOverview', () => {
    it('should calculate 4-step RBIA overview metrics', async () => {
      const res = await service.getOverview(2026);
      expect(res).toBeDefined();
      expect(res.year).toBe(2026);
      expect(res.step1Scope).toBeDefined();
      expect(res.step2Library).toBeDefined();
      expect(res.step3Prioritization).toBeDefined();
      expect(res.step4Plan).toBeDefined();
    });
  });

  describe('getRiskSignals', () => {
    it('should return aggregated telemetry signals array', async () => {
      const signals = await service.getRiskSignals(1, 2026);
      expect(Array.isArray(signals)).toBe(true);
    });
  });
});
