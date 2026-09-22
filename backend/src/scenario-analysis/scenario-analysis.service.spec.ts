import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ScenarioAnalysisService } from './scenario-analysis.service';
import { ScenarioRegister } from './entities/scenario-register.entity';
import { RiskScenarioAnalysis } from './entities/risk-scenario-analysis.entity';

describe('ScenarioAnalysisService', () => {
  let service: ScenarioAnalysisService;
  let scnRepo: any;
  let anlRepo: any;

  beforeEach(async () => {
    scnRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    anlRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 1, ...entity })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScenarioAnalysisService,
        { provide: getRepositoryToken(ScenarioRegister), useValue: scnRepo },
        {
          provide: getRepositoryToken(RiskScenarioAnalysis),
          useValue: anlRepo,
        },
      ],
    }).compile();

    service = module.get<ScenarioAnalysisService>(ScenarioAnalysisService);
  });

  it('should compute scores, delta, trajectory and appetite breach accurately', () => {
    const metrics = service.computeRiskMetrics({
      baseImpact: 4,
      baseLikelihood: 2,
      scenarioImpact: 5,
      scenarioLikelihood: 4,
      appetiteThreshold: 12,
    });

    expect(metrics.baseResidualScore).toBe(8);
    expect(metrics.scenarioResidualScore).toBe(20);
    expect(metrics.deltaResidual).toBe(12);
    expect(metrics.riskTrajectory).toBe('Increasing');
    expect(metrics.isAboveAppetite).toBe(true);
    expect(metrics.finalBand).toBe('Critical');
    expect(metrics.auditResponse).toBe('Immediate Assurance');
  });

  it('should identify stable trajectory and within appetite', () => {
    const metrics = service.computeRiskMetrics({
      baseImpact: 3,
      baseLikelihood: 2,
      scenarioImpact: 3,
      scenarioLikelihood: 2,
      appetiteThreshold: 12,
    });

    expect(metrics.deltaResidual).toBe(0);
    expect(metrics.riskTrajectory).toBe('Stable');
    expect(metrics.isAboveAppetite).toBe(false);
    expect(metrics.finalBand).toBe('Low');
    expect(metrics.auditResponse).toBe('No Action');
  });
});
