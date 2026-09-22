import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AuditSamplesService } from './audit-samples.service';
import { AuditSampleBatch } from './entities/audit-sample-batch.entity';
import { AuditSample } from './entities/audit-sample.entity';
import { AuditFinding } from './entities/audit-finding.entity';
import { AuditFindingPersonnel } from './entities/audit-finding-personnel.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';
import { WorkingPaper } from '../working-papers/entities/working-paper.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import { SampleType, TestResult } from './entities/sample-enums';

describe('AuditSamplesService', () => {
  let service: AuditSamplesService;

  const mockBatch: Partial<AuditSampleBatch> = {
    id: 1,
    engagementId: 10,
    workingPaperId: 5,
    batchName: 'Đợt chọn mẫu Tín dụng 2026',
    sampleType: SampleType.DETAIL,
    sampleSize: 2,
    samples: [
      {
        id: 101,
        batchId: 1,
        sequenceNo: 1,
        testResult: TestResult.PASS,
        findingId: null,
      } as any,
      {
        id: 102,
        batchId: 1,
        sequenceNo: 2,
        testResult: TestResult.FAIL,
        findingId: 99,
      } as any,
    ],
  };

  const mockBatchRepo = {
    create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 1 })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    find: jest.fn().mockResolvedValue([mockBatch]),
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    remove: jest.fn().mockResolvedValue(mockBatch),
  };

  const mockSampleRepo = {
    create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 103 })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockFindingRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockPersonnelRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockEngagementRepo = {
    findOne: jest.fn(),
  };

  const mockWpRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockRecRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditSamplesService,
        {
          provide: getRepositoryToken(AuditSampleBatch),
          useValue: mockBatchRepo,
        },
        {
          provide: getRepositoryToken(AuditSample),
          useValue: mockSampleRepo,
        },
        {
          provide: getRepositoryToken(AuditFinding),
          useValue: mockFindingRepo,
        },
        {
          provide: getRepositoryToken(AuditFindingPersonnel),
          useValue: mockPersonnelRepo,
        },
        {
          provide: getRepositoryToken(AuditEngagement),
          useValue: mockEngagementRepo,
        },
        {
          provide: getRepositoryToken(WorkingPaper),
          useValue: mockWpRepo,
        },
        {
          provide: getRepositoryToken(Recommendation),
          useValue: mockRecRepo,
        },
      ],
    }).compile();

    service = module.get<AuditSamplesService>(AuditSamplesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBatch', () => {
    it('should create and save a new sample batch', async () => {
      const dto = {
        engagementId: 10,
        workingPaperId: 5,
        batchName: 'Đợt mẫu mới',
        sampleType: SampleType.DETAIL,
      };

      const result = await service.createBatch(dto);
      expect(result).toBeDefined();
      expect(mockBatchRepo.create).toHaveBeenCalledWith(dto);
      expect(mockBatchRepo.save).toHaveBeenCalled();
    });
  });

  describe('findAllBatches', () => {
    it('should return batches filtering by engagementId and workingPaperId', async () => {
      const result = await service.findAllBatches(10, 5);
      expect(result).toEqual([mockBatch]);
      expect(mockBatchRepo.find).toHaveBeenCalledWith({
        where: { engagementId: 10, workingPaperId: 5 },
        relations: ['samples'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOneBatch', () => {
    it('should return the batch if found', async () => {
      mockBatchRepo.findOne.mockResolvedValue(mockBatch);

      const result = await service.findOneBatch(1);
      expect(result).toEqual(mockBatch);
    });

    it('should throw 404 HttpException if batch is not found', async () => {
      mockBatchRepo.findOne.mockResolvedValue(null);

      await expect(service.findOneBatch(999)).rejects.toThrow(HttpException);
    });
  });

  describe('getBatchStats', () => {
    it('should correctly calculate sample testing statistics', async () => {
      mockBatchRepo.findOne.mockResolvedValue(mockBatch);

      const stats = await service.getBatchStats(1);
      expect(stats.total).toBe(2);
      expect(stats.tested).toBe(2);
      expect(stats.pass).toBe(1);
      expect(stats.fail).toBe(1);
      expect(stats.exception).toBe(0);
      expect(stats.withFindings).toBe(1);
    });
  });

  describe('addSample', () => {
    it('should create a sample, assign sequenceNo, and update batch sampleSize', async () => {
      mockBatchRepo.findOne.mockResolvedValue(mockBatch);

      const dto = {
        sampleCode: 'SMP-001',
        cifOrAccount: '12345678',
        customerName: 'Nguyễn Văn A',
      };

      const result = await service.addSample(1, dto);
      expect(result).toBeDefined();
      expect(mockSampleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...dto,
          batchId: 1,
          sequenceNo: 3, // maxSeq (2) + 1
        }),
      );
      expect(mockBatchRepo.update).toHaveBeenCalledWith(1, { sampleSize: 3 });
    });
  });

  describe('addSamplesBulk', () => {
    it('should create multiple samples in bulk and update batch sampleSize', async () => {
      mockBatchRepo.findOne.mockResolvedValue(mockBatch);

      const dto = {
        samples: [
          { cifOrAccount: 'CIF001', customerName: 'Khách hàng 1' },
          { cifOrAccount: 'CIF002', customerName: 'Khách hàng 2' },
        ],
      };

      const result = await service.addSamplesBulk(1, dto);
      expect(result).toBeDefined();
      expect(mockSampleRepo.create).toHaveBeenCalledTimes(2);
      expect(mockBatchRepo.update).toHaveBeenCalledWith(1, { sampleSize: 4 });
    });
  });

  describe('getBatchAnalytics', () => {
    it('should return analytics grouped by branch and customer type', async () => {
      mockBatchRepo.findOne.mockResolvedValue({
        ...mockBatch,
        samples: [
          {
            id: 1,
            branchCode: 'CN_HN',
            customerType: 'KHCN',
            loanAmount: 5,
            testResult: TestResult.PASS,
          },
          {
            id: 2,
            branchCode: 'CN_HN',
            customerType: 'KHDN',
            loanAmount: 10,
            testResult: TestResult.FAIL,
          },
        ],
      });

      const res = await service.getBatchAnalytics(1);
      expect(res.totalSamples).toBe(2);
      expect(res.byBranch).toHaveLength(1);
      expect(res.byBranch[0].branchCode).toBe('CN_HN');
      expect(res.byBranch[0].passCount).toBe(1);
      expect(res.byBranch[0].failCount).toBe(1);
      expect(res.byCustomerType).toHaveLength(2);
    });
  });

  describe('autoVerifyBatch', () => {
    it('should auto-verify samples using CAATTs rules', async () => {
      mockBatchRepo.findOne.mockResolvedValue({
        ...mockBatch,
        samples: [
          {
            id: 1,
            debtGroup: '1',
            condition: '',
            testResult: TestResult.NOT_TESTED,
          },
          {
            id: 2,
            debtGroup: '3',
            condition: '',
            testResult: TestResult.NOT_TESTED,
          },
        ],
      });

      const res = await service.autoVerifyBatch(1);
      expect(res.verifiedCount).toBe(2);
      expect(res.passed).toBeGreaterThanOrEqual(0);
      expect(res.failed).toBeGreaterThanOrEqual(1); // debtGroup 3 must fail
      expect(mockSampleRepo.save).toHaveBeenCalled();
    });
  });

  describe('autoGenerateSamples', () => {
    it('should generate requested number of samples and update sampleSize', async () => {
      mockBatchRepo.findOne.mockResolvedValue({
        ...mockBatch,
        samples: [],
      });
      mockSampleRepo.count = jest.fn().mockResolvedValue(10);

      const res = await service.autoGenerateSamples(1, {
        sampleSize: 10,
        domain: 'CREDIT',
      });
      expect(res.generated).toBe(10);
      expect(mockSampleRepo.create).toHaveBeenCalledTimes(10);
      expect(mockSampleRepo.save).toHaveBeenCalled();
      expect(mockBatchRepo.update).toHaveBeenCalledWith(1, { sampleSize: 10 });
    });
  });

  describe('bulkAssignSamples', () => {
    it('should update assignedAuditorId and assignedAuditorName for given sampleIds', async () => {
      mockSampleRepo.update.mockResolvedValue({ affected: 3 });

      const res = await service.bulkAssignSamples(
        [101, 102, 103],
        42,
        'Trần Kiểm Toán',
      );
      expect(res.updated).toBe(3);
      expect(mockSampleRepo.update).toHaveBeenCalled();
    });

    it('should return updated 0 when sampleIds is empty', async () => {
      const res = await service.bulkAssignSamples([]);
      expect(res.updated).toBe(0);
      expect(mockSampleRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('generateSampleTemplate', () => {
    it('should generate an Excel buffer with engagement team info', async () => {
      mockEngagementRepo.findOne.mockResolvedValue({
        id: 10,
        leadAuditorUser: { fullName: 'Nguyễn Văn Trưởng' },
        teamMembers: [
          { userId: 1, fullName: 'Phạm Thị Thành Viên', role: 'KTV Tín dụng' },
        ],
      });

      const buffer = await service.generateSampleTemplate(10);
      expect(buffer).toBeDefined();
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});
