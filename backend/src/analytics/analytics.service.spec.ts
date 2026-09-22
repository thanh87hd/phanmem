import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsResult } from './entities/analytics-result.entity';
import * as ExcelJS from 'exceljs';

jest.mock('exceljs');

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let resultRepo: any;

  beforeEach(async () => {
    resultRepo = {
      create: jest.fn((dto) => ({ ...dto, id: 1 })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getRepositoryToken(AnalyticsResult), useValue: resultRepo },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executeScript', () => {
    it('should throw BadRequestException if file is empty or missing', async () => {
      await expect(service.executeScript('duplicates')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should detect duplicate rows in duplicates scenario', async () => {
      const mockRows = [
        { STT: 1, account: '123', amount: 5000 },
        { STT: 2, account: '123', amount: 5000 },
        { STT: 3, account: '456', amount: 9000 },
      ];

      (ExcelJS.Workbook as jest.Mock).mockImplementation(() => ({
        xlsx: {
          readFile: jest.fn().mockResolvedValue(undefined),
        },
        worksheets: [{ name: 'Data' }],
        getWorksheet: jest.fn(() => ({
          eachRow: (callback: (row: any, rowNumber: number) => void) => {
            callback({ values: [null, 'STT', 'account', 'amount'] }, 1);
            mockRows.forEach((r, idx) => {
              callback({ values: [null, r.STT, r.account, r.amount] }, idx + 2);
            });
          },
        })),
      }));

      const result = await service.executeScript('duplicates', {
        path: 'test.xlsx',
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain('trùng lặp hoàn toàn');
      expect(result.data.length).toBe(2);
      expect(resultRepo.save).toHaveBeenCalled();
    });

    it('should analyze Benford law distribution on amount column', async () => {
      const mockRows = Array.from({ length: 50 }).map((_, i) => ({
        STT: i + 1,
        so_tien: 1000 + i * 10,
      }));

      (ExcelJS.Workbook as jest.Mock).mockImplementation(() => ({
        xlsx: {
          readFile: jest.fn().mockResolvedValue(undefined),
        },
        worksheets: [{ name: 'Data' }],
        getWorksheet: jest.fn(() => ({
          eachRow: (callback: (row: any, rowNumber: number) => void) => {
            callback({ values: [null, 'STT', 'so_tien'] }, 1);
            mockRows.forEach((r, idx) => {
              callback({ values: [null, r.STT, r.so_tien] }, idx + 2);
            });
          },
        })),
      }));

      const result = await service.executeScript('benford', {
        path: 'test.xlsx',
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(9);
    });
  });

  describe('getHistory', () => {
    it('should return analytics run history sorted by executedAt DESC', async () => {
      resultRepo.find.mockResolvedValue([
        { id: 1, scenarioType: 'duplicates' },
      ]);
      const history = await service.getHistory();
      expect(history).toHaveLength(1);
      expect(resultRepo.find).toHaveBeenCalledWith({
        order: { executedAt: 'DESC' },
      });
    });
  });
});
