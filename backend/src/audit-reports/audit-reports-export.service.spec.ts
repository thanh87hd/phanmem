import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditReportsExportService } from './audit-reports-export.service';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';

describe('AuditReportsExportService', () => {
  let service: AuditReportsExportService;

  const mockFindingRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockRecRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditReportsExportService,
        {
          provide: getRepositoryToken(AuditFinding),
          useValue: mockFindingRepo,
        },
        {
          provide: getRepositoryToken(Recommendation),
          useValue: mockRecRepo,
        },
      ],
    }).compile();

    service = module.get<AuditReportsExportService>(AuditReportsExportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateWord', () => {
    it('should generate a valid Word (docx) buffer from report data', async () => {
      const mockReport: any = {
        id: 1,
        title: 'BÁO CÁO KIỂM TOÁN NỘI BỘ TOÀN DIỆN CHI NHÁNH ĐẮK LẮK NĂM 2026',
        reportCode: 'BCKT-2026-001',
        decisionNo: '87/2026/QĐ-IA',
        date: '2026-03-31',
        status: 'Issued',
        isSigned: true,
        scope: 'Toàn bộ hoạt động tín dụng, phi tín dụng và ngân quỹ.',
        executiveSummary:
          'Đoàn kiểm toán đã hoàn tất kiểm toán theo đúng kế hoạch.',
        overallConclusion: 'Hệ thống KSNB vận hành hiệu quả.',
        engagementId: 10,
        recommendationsList: [
          {
            id: 1,
            recommendation: 'Rà soát hạn mức tín dụng',
            legacyDepartment: 'Chi nhánh Đắk Lắk',
            dueDate: '2026-06-30',
          },
        ],
      };

      mockFindingRepo.find.mockResolvedValue([
        {
          id: 1,
          findingCode: 'FD-CREDIT-01',
          findingTitle: 'Hồ sơ thiếu công chứng thế chấp',
          riskLevel: 'High',
          operationType: 'Tín dụng',
          actualFineAmount: 5000000,
          condition: '3 hồ sơ giải ngân thiếu biên bản công chứng',
          criteria: 'Thông tư 39/2016/TT-NHNN',
          cause: 'KTV địa bàn sơ suất',
          consequence: 'Nguy cơ tranh chấp pháp lý',
          recommendation: 'Bổ sung công chứng ngay',
          auditeeResponse: 'Đồng ý và đang bổ sung',
        },
      ]);

      mockRecRepo.find.mockResolvedValue([
        {
          id: 1,
          findingId: 1,
          recommendation: 'Bổ sung công chứng ngay',
          legacyDepartment: 'Chi nhánh Đắk Lắk',
          dueDate: '2026-06-30',
          slaStatus: 'ChuaDenHan',
        },
      ]);

      const buffer = await service.generateWord(mockReport);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(1000);
      // Valid docx files are zip archives starting with 'PK'
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
    });
  });

  describe('generatePdf', () => {
    it('should generate a valid PDF buffer from report data', async () => {
      const mockReport: any = {
        id: 2,
        title: 'BÁO CÁO KIỂM TOÁN NGHIỆP VỤ CNTT NĂM 2026',
        reportCode: 'BCKT-IT-2026-002',
        decisionNo: '12/2026/QĐ-BKS',
        date: '2026-04-15',
        status: 'Draft',
        isSigned: false,
        scope: 'Kiểm toán hệ thống Core Banking.',
        executiveSummary: 'Phát hiện một số điểm yếu kiểm soát phân quyền.',
        engagementId: 20,
      };

      mockFindingRepo.find.mockResolvedValue([]);
      mockRecRepo.find.mockResolvedValue([]);

      const buffer = await service.generatePdf(mockReport);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(100);
      // Valid PDF files start with '%PDF'
      const header = buffer.subarray(0, 4).toString('utf8');
      expect(header).toBe('%PDF');
    });
  });
});
