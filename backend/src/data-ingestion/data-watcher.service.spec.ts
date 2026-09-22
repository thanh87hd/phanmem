import { Test, TestingModule } from '@nestjs/testing';
import { DataWatcherService } from './data-watcher.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  DataIngestionBatch,
  IngestionStatus,
} from './entities/data-ingestion-batch.entity';
import { DataPipelineService } from './data-pipeline.service';
import * as fs from 'fs';

jest.mock('fs');

describe('DataWatcherService', () => {
  let service: DataWatcherService;

  const mockBatchRepo = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 'b-saved', ...dto })),
  };

  const mockPipelineService = {
    processBatch: jest
      .fn()
      .mockResolvedValue({ status: IngestionStatus.COMPLETED }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.renameSync as jest.Mock).mockReturnValue(undefined);
    (fs.statSync as jest.Mock).mockReturnValue({ size: 1024 } as any);
    (fs.readFileSync as jest.Mock).mockReturnValue(
      Buffer.from('sample content'),
    );
    (fs.readdirSync as jest.Mock).mockReturnValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataWatcherService,
        {
          provide: getRepositoryToken(DataIngestionBatch),
          useValue: mockBatchRepo,
        },
        { provide: DataPipelineService, useValue: mockPipelineService },
      ],
    }).compile();

    service = module.get<DataWatcherService>(DataWatcherService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit and handleCronScan', () => {
    it('should initialize directories onModuleInit', () => {
      service.onModuleInit();
      expect(fs.existsSync).toHaveBeenCalled();
    });

    it('should run handleCronScan and trigger scanInbox', async () => {
      const spy = jest.spyOn(service, 'scanInbox').mockResolvedValue({
        scannedFiles: 0,
        processedBatches: [],
        skippedDuplicates: [],
      });

      await service.handleCronScan();
      expect(spy).toHaveBeenCalledWith('SYSTEM_WATCHER');
    });
  });

  describe('scanInbox', () => {
    it('should return empty result if inbox directory does not exist', async () => {
      (fs.existsSync as jest.Mock).mockImplementation((pathStr: string) => {
        if (typeof pathStr === 'string' && pathStr.endsWith('inbox'))
          return false;
        return true;
      });

      const result = await service.scanInbox();
      expect(result.scannedFiles).toBe(0);
      expect(result.processedBatches).toHaveLength(0);
    });

    it('should detect duplicate file and move to duplicates folder', async () => {
      (fs.readdirSync as jest.Mock).mockReturnValue([
        { isFile: () => true, name: 'dup_file.csv' },
      ]);
      mockBatchRepo.findOne.mockResolvedValue({
        id: 'b-existing',
        fileHash: 'hash123',
      });

      jest
        .spyOn<any, any>(service, 'checkFileStability')
        .mockResolvedValue(true);

      const result = await service.scanInbox('ADMIN');
      expect(result.skippedDuplicates).toContain('dup_file.csv');
      expect(fs.renameSync).toHaveBeenCalled();
      expect(mockBatchRepo.save).not.toHaveBeenCalled();
    });

    it('should process new file and archive it', async () => {
      (fs.readdirSync as jest.Mock).mockReturnValue([
        { isFile: () => true, name: 'new_metrics.xlsx' },
      ]);
      mockBatchRepo.findOne.mockResolvedValue(null);

      jest
        .spyOn<any, any>(service, 'checkFileStability')
        .mockResolvedValue(true);

      const result = await service.scanInbox('OPERATOR');
      expect(result.scannedFiles).toBe(1);
      expect(result.processedBatches).toHaveLength(1);
      expect(fs.renameSync).toHaveBeenCalled();
      expect(mockBatchRepo.save).toHaveBeenCalled();
      expect(mockPipelineService.processBatch).toHaveBeenCalledWith('b-saved');
    });
  });
});
