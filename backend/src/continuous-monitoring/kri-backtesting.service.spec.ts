import { Test, TestingModule } from '@nestjs/testing';
import { KriBacktestingService } from './kri-backtesting.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  KriBacktestResult,
  BacktestStrategy,
} from './entities/kri-backtest-result.entity';
import { FactDailyMetric } from './entities/fact-daily-metric.entity';
import { DebtMigrationRecord } from './entities/debt-migration.entity';
import { KriRuleConfig } from './entities/kri-rule-config.entity';

describe('KriBacktestingService', () => {
  let service: KriBacktestingService;

  const mockBacktestRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
  };

  const mockFactMetricRepo = {};
  const mockDebtMigrationRepo = {};
  const mockKriRuleRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KriBacktestingService,
        {
          provide: getRepositoryToken(KriBacktestResult),
          useValue: mockBacktestRepo,
        },
        {
          provide: getRepositoryToken(FactDailyMetric),
          useValue: mockFactMetricRepo,
        },
        {
          provide: getRepositoryToken(DebtMigrationRecord),
          useValue: mockDebtMigrationRepo,
        },
        {
          provide: getRepositoryToken(KriRuleConfig),
          useValue: mockKriRuleRepo,
        },
      ],
    }).compile();

    service = module.get<KriBacktestingService>(KriBacktestingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllResults and getResultById', () => {
    it('should return all backtest results', async () => {
      mockBacktestRepo.find.mockResolvedValue([{ id: 1, ruleCode: 'KRI_NPL' }]);
      const results = await service.getAllResults();
      expect(results).toHaveLength(1);
    });

    it('should return result by id', async () => {
      mockBacktestRepo.findOne.mockResolvedValue({
        id: 1,
        ruleCode: 'KRI_NPL',
      });
      const result = await service.getResultById(1);
      expect(result?.ruleCode).toBe('KRI_NPL');
    });
  });

  describe('runBacktest', () => {
    it('should run backtest simulation with rule from repo', async () => {
      mockKriRuleRepo.findOne.mockResolvedValue({
        ruleCode: 'KRI_NPL',
        metricName: 'Tỷ lệ Nợ xấu',
        yellowThreshold: 3.0,
        redThreshold: 5.0,
        operator: '>=',
      });

      const payload = {
        ruleCode: 'KRI_NPL',
        startDate: '2026-01-01',
        endDate: '2026-03-01',
        strategy: BacktestStrategy.HISTORICAL_REPLAY,
        user: { fullName: 'Chuyên viên QLRR' },
      };

      const result = await service.runBacktest(payload);
      expect(result).toBeDefined();
      expect(result.ruleCode).toBe('KRI_NPL');
      expect(result.totalObservations).toBeGreaterThan(0);
      expect(result.f1Score).toBeDefined();
      expect(result.aucRoc).toBeDefined();
      expect(result.optimalThresholdRecommendation).toBeDefined();
      expect(mockBacktestRepo.save).toHaveBeenCalled();
    });

    it('should run backtest with custom thresholds provided', async () => {
      mockKriRuleRepo.findOne.mockResolvedValue(null);

      const payload = {
        ruleCode: 'KRI_CUSTOM',
        startDate: '2026-01-01',
        endDate: '2026-02-01',
        testedThresholds: {
          yellowThreshold: 2.5,
          redThreshold: 4.0,
          comparisonOperator: '>=',
        },
      };

      const result = await service.runBacktest(payload);
      expect(result).toBeDefined();
      expect(result.testedThresholds.yellowThreshold).toBe(2.5);
      expect(mockBacktestRepo.save).toHaveBeenCalled();
    });
  });
});
