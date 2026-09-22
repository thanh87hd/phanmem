import { Test, TestingModule } from '@nestjs/testing';
import { DataIngestionService } from './data-ingestion.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  DataIngestionBatch,
  IngestionSource,
  IngestionStatus,
} from './entities/data-ingestion-batch.entity';
import { DataPipelineService } from './data-pipeline.service';
import { DataWatcherService } from './data-watcher.service';
import { NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import { FastifyUploadedFile } from '../common/interceptors/fastify-file-interceptor';

jest.mock('fs');

describe('DataIngestionService', () => {
  let service: DataIngestionService;

  const mockQueryBuilder = {
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[{ id: 'b-1' }], 1]),
  };

  const mockBatchRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 'b-new', ...dto })),
  };

  const mockPipelineService = {
    processBatch: jest
      .fn()
      .mockResolvedValue({ status: IngestionStatus.COMPLETED }),
  };

  const mockWatcherService = {
    scanInbox: jest.fn().mockResolvedValue({ processedBatches: 2 }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataIngestionService,
        {
          provide: getRepositoryToken(DataIngestionBatch),
          useValue: mockBatchRepo,
        },
        { provide: DataPipelineService, useValue: mockPipelineService },
        { provide: DataWatcherService, useValue: mockWatcherService },
      ],
    }).compile();

    service = module.get<DataIngestionService>(DataIngestionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllBatches', () => {
    it('should return paginated batches with filters', async () => {
      const result = await service.getAllBatches({
        dataSource: IngestionSource.API_PUSH,
        status: IngestionStatus.COMPLETED,
        periodDate: '2026-03-01',
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(3);
    });
  });

  describe('getBatchById', () => {
    it('should return batch if found', async () => {
      mockBatchRepo.findOne.mockResolvedValue({ id: 'b-1', batchCode: 'B01' });
      const result = await service.getBatchById('b-1');
      expect(result.batchCode).toBe('B01');
    });

    it('should throw NotFoundException if batch not found', async () => {
      mockBatchRepo.findOne.mockResolvedValue(null);
      await expect(service.getBatchById('b-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('handleFileUpload', () => {
    it('should throw error if no file provided', async () => {
      await expect(service.handleFileUpload(null as any)).rejects.toThrow(
        'No file provided',
      );
    });

    it('should save file to archive directory and queue batch for processing', async () => {
      const mockFile = {
        originalname: 'transactions.csv',
        buffer: Buffer.from('code,amount\nTX01,100'),
        size: 50,
        mimetype: 'text/csv',
      } as FastifyUploadedFile;

      const result = await service.handleFileUpload(
        mockFile,
        IngestionSource.API_PUSH,
        '2026-03-01',
        'ADMIN',
      );

      expect(result).toBeDefined();
      expect(result.batchCode).toContain('BATCH-');
      expect(result.status).toBe(IngestionStatus.QUEUED);
      expect(mockBatchRepo.save).toHaveBeenCalled();
      expect(mockPipelineService.processBatch).toHaveBeenCalledWith('b-new');
    });
  });

  describe('reprocessBatch', () => {
    it('should reset status to QUEUED and trigger pipeline', async () => {
      mockBatchRepo.findOne.mockResolvedValue({
        id: 'b-1',
        batchCode: 'BC-01',
        status: IngestionStatus.FAILED,
      });

      const result = await service.reprocessBatch('b-1');
      expect(result.status).toBe(IngestionStatus.QUEUED);
      expect(mockBatchRepo.save).toHaveBeenCalled();
      expect(mockPipelineService.processBatch).toHaveBeenCalledWith('b-1');
    });
  });

  describe('triggerManualScan', () => {
    it('should call watcherService scanInbox', async () => {
      const result = await service.triggerManualScan('OPERATOR');
      expect(result).toEqual({ processedBatches: 2 });
      expect(mockWatcherService.scanInbox).toHaveBeenCalledWith('OPERATOR');
    });
  });

  describe('generateTemplate', () => {
    it('should generate transactions Excel template', async () => {
      const buffer = await service.generateTemplate('transactions');
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should generate metrics Excel template', async () => {
      const buffer = await service.generateTemplate('metrics');
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});
