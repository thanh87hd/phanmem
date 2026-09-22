import { Test, TestingModule } from '@nestjs/testing';
import { DataPipelineService } from './data-pipeline.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  DataIngestionBatch,
  IngestionStatus,
} from './entities/data-ingestion-batch.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { FactDailyMetric } from '../continuous-monitoring/entities/fact-daily-metric.entity';
import { KriAlert } from '../risk-indicators/entities/kri-alert.entity';
import { KriRuleConfig } from '../continuous-monitoring/entities/kri-rule-config.entity';
import { ContinuousMonitoringService } from '../continuous-monitoring/continuous-monitoring.service';
import * as fs from 'fs';

jest.mock('fs');

describe('DataPipelineService', () => {
  let service: DataPipelineService;

  const mockBatchRepo = {
    findOne: jest.fn(),
    save: jest.fn().mockImplementation((b) => Promise.resolve(b)),
  };

  const mockTransactionRepo = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
  };

  const mockFactMetricRepo = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
  };

  const mockKriAlertRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
  };

  const mockKriRuleConfigRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockContinuousMonitoringService = {
    runScan: jest.fn().mockResolvedValue({ totalAlerts: 0 }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataPipelineService,
        {
          provide: getRepositoryToken(DataIngestionBatch),
          useValue: mockBatchRepo,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepo,
        },
        {
          provide: getRepositoryToken(FactDailyMetric),
          useValue: mockFactMetricRepo,
        },
        { provide: getRepositoryToken(KriAlert), useValue: mockKriAlertRepo },
        {
          provide: getRepositoryToken(KriRuleConfig),
          useValue: mockKriRuleConfigRepo,
        },
        {
          provide: ContinuousMonitoringService,
          useValue: mockContinuousMonitoringService,
        },
      ],
    }).compile();

    service = module.get<DataPipelineService>(DataPipelineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processBatch validations', () => {
    it('should throw error if batch is not found', async () => {
      mockBatchRepo.findOne.mockResolvedValue(null);
      await expect(service.processBatch('non-existent')).rejects.toThrow(
        'Batch non-existent not found',
      );
    });

    it('should skip if batch is already COMPLETED or PROCESSING', async () => {
      const batch = {
        id: 'b-1',
        status: IngestionStatus.COMPLETED,
        batchCode: 'BC-01',
      };
      mockBatchRepo.findOne.mockResolvedValue(batch);

      const result = await service.processBatch('b-1');
      expect(result).toBe(batch);
      expect(mockBatchRepo.save).not.toHaveBeenCalled();
    });

    it('should throw and mark FAILED if file does not exist', async () => {
      const batch = {
        id: 'b-2',
        status: IngestionStatus.QUEUED,
        batchCode: 'BC-02',
        rawFilePath: '/uploads/missing.csv',
        fileName: 'missing.csv',
      };
      mockBatchRepo.findOne.mockResolvedValue(batch);
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(service.processBatch('b-2')).rejects.toThrow(
        'Raw file path does not exist',
      );
      expect(batch.status).toBe(IngestionStatus.FAILED);
      expect(mockBatchRepo.save).toHaveBeenCalled();
    });

    it('should throw and mark FAILED for unsupported format', async () => {
      const batch = {
        id: 'b-3',
        status: IngestionStatus.QUEUED,
        batchCode: 'BC-03',
        rawFilePath: '/uploads/file.pdf',
        fileName: 'file.pdf',
      };
      mockBatchRepo.findOne.mockResolvedValue(batch);
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      await expect(service.processBatch('b-3')).rejects.toThrow(
        'Unsupported file format',
      );
      expect(batch.status).toBe(IngestionStatus.FAILED);
    });
  });

  describe('processBatch with JSON transactions', () => {
    it('should process JSON transactions and trigger monitoring scan', async () => {
      const batch = {
        id: 'b-4',
        status: IngestionStatus.QUEUED,
        batchCode: 'BATCH_TX_01',
        rawFilePath: '/uploads/tx.json',
        fileName: 'tx.json',
      };
      mockBatchRepo.findOne.mockResolvedValue(batch);
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const jsonContent = JSON.stringify([
        {
          transactioncode: 'TX001',
          accountid: 'ACC100',
          amount: 5000000,
          customername: 'Nguyen Van A',
          description: 'Chuyen tien',
        },
      ]);
      (fs.readFileSync as jest.Mock).mockReturnValue(jsonContent);
      mockTransactionRepo.findOne.mockResolvedValue(null);

      const result = await service.processBatch('b-4');
      expect(result.status).toBe(IngestionStatus.COMPLETED);
      expect(result.successCount).toBe(1);
      expect(mockTransactionRepo.save).toHaveBeenCalled();
      expect(mockContinuousMonitoringService.runScan).toHaveBeenCalled();
    });
  });

  describe('processBatch with CSV FactDailyMetrics and KRI alerts', () => {
    it('should process CSV metrics and generate KRI alert when threshold breached', async () => {
      const batch = {
        id: 'b-5',
        status: IngestionStatus.QUEUED,
        batchCode: 'BATCH_METRIC_01',
        rawFilePath: '/uploads/metrics.csv',
        fileName: 'metrics.csv',
        periodDate: '2026-03-01',
      };
      mockBatchRepo.findOne.mockResolvedValue(batch);
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const csvContent =
        'branchcode,metricdate,nplratio,carratio\nCN_01,2026-03-01,4.5,9.2';
      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);

      mockFactMetricRepo.findOne.mockResolvedValue(null);
      mockKriRuleConfigRepo.find.mockResolvedValue([
        {
          ruleCode: 'KRI_NPL',
          metricName: 'Tỷ lệ Nợ xấu',
          operator: '>',
          redThreshold: 3.0,
          yellowThreshold: 2.0,
          category: 'Credit',
        },
      ]);

      const result = await service.processBatch('b-5');
      expect(result.status).toBe(IngestionStatus.COMPLETED);
      expect(result.successCount).toBe(1);
      expect(mockFactMetricRepo.save).toHaveBeenCalled();
      expect(mockKriAlertRepo.save).toHaveBeenCalled();
    });
  });
});
