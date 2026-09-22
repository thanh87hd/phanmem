import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AuditMinutesExportService } from './audit-minutes-export.service';
import { AuditMinute } from './entities/audit-minute.entity';
import { AuditFinding } from './entities/audit-finding.entity';
import { AuditSample } from './entities/audit-sample.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';

describe('AuditMinutesExportService', () => {
  let service: AuditMinutesExportService;

  const mockMinute: Partial<AuditMinute> = {
    id: 1,
    engagementId: 10,
    minuteType: 'MB04_MERGED',
    auditedUnitName: 'Chi nhánh Hà Nội',
    leadAuditorName: 'Nguyễn Văn Kiểm Toán',
    findings: [],
  };

  const mockEngagement: Partial<AuditEngagement> = {
    id: 10,
    name: 'Kiểm toán Chi nhánh Hà Nội 2026',
    branchName: 'Chi nhánh Hà Nội',
    branchCode: 'CN_HN',
    leadAuditorUser: { id: 1, fullName: 'Nguyễn Văn Kiểm Toán' } as any,
  };

  const mockFindings: Partial<AuditFinding>[] = [
    {
      id: 101,
      minuteId: 1,
      engagementId: 10,
      operationType: 'TD',
      findingTitle: 'Thiếu định giá tài sản bảo đảm',
      riskLevel: 'High',
      condition: 'Hồ sơ vay không có biên bản thẩm định thực tế',
      consequence: 'Nguy cơ thất thoát vốn tín dụng',
      cause: 'Cán bộ chạy theo chỉ tiêu',
      recommendation: 'Tái thẩm định toàn bộ tài sản bảo đảm',
      personnel: [],
    },
    {
      id: 102,
      minuteId: 1,
      engagementId: 10,
      operationType: 'PTD',
      findingTitle: 'Chênh lệch quỹ tiền mặt đầu ca',
      riskLevel: 'Medium',
      condition: 'Kiểm kê tiền mặt quỹ âm 5 triệu',
      consequence: 'Rủi ro thất thoát ngân quỹ',
      cause: 'Thủ quỹ ghi chép chậm',
      recommendation: 'Chấn chỉnh thủ tục kiểm quỹ hàng ngày',
      personnel: [],
    },
  ];

  const mockMinuteRepo = {
    findOne: jest.fn(),
  };

  const mockFindingRepo = {
    find: jest.fn(),
  };

  const mockQueryBuilder = {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  const mockSampleRepo = {
    find: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockEngagementRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditMinutesExportService,
        {
          provide: getRepositoryToken(AuditMinute),
          useValue: mockMinuteRepo,
        },
        {
          provide: getRepositoryToken(AuditFinding),
          useValue: mockFindingRepo,
        },
        {
          provide: getRepositoryToken(AuditSample),
          useValue: mockSampleRepo,
        },
        {
          provide: getRepositoryToken(AuditEngagement),
          useValue: mockEngagementRepo,
        },
      ],
    }).compile();

    service = module.get<AuditMinutesExportService>(AuditMinutesExportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return the audit minute if found', async () => {
      mockMinuteRepo.findOne.mockResolvedValue(mockMinute);

      const result = await service.findOne(1);
      expect(result).toEqual(mockMinute);
      expect(mockMinuteRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['findings', 'findings.personnel', 'engagement'],
      });
    });

    it('should throw NotFoundException if minute is not found', async () => {
      mockMinuteRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateWord', () => {
    it('should generate a valid docx Buffer for MB04_MERGED mode', async () => {
      mockMinuteRepo.findOne.mockResolvedValue(mockMinute);
      mockEngagementRepo.findOne.mockResolvedValue(mockEngagement);
      mockFindingRepo.find.mockResolvedValue(mockFindings);

      const buffer = await service.generateWord(1, 'MB04_MERGED');
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
      // Valid docx has zip header 'PK' (0x50, 0x4B)
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
    });

    it('should filter findings when generating MB04_TD mode', async () => {
      mockMinuteRepo.findOne.mockResolvedValue(mockMinute);
      mockEngagementRepo.findOne.mockResolvedValue(mockEngagement);
      mockFindingRepo.find.mockResolvedValue(mockFindings);

      const buffer = await service.generateWord(1, 'MB04_TD');
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
    });
  });

  describe('generateExcel', () => {
    it('should generate a valid xlsx Buffer with PK header', async () => {
      mockMinuteRepo.findOne.mockResolvedValue(mockMinute);
      mockEngagementRepo.findOne.mockResolvedValue(mockEngagement);
      mockFindingRepo.find.mockResolvedValue(mockFindings);

      const buffer = await service.generateExcel(1, 'MB04_MERGED');
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
      // Valid xlsx has zip header 'PK' (0x50, 0x4B)
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
    });
  });
});
