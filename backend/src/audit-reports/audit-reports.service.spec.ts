import { Test, TestingModule } from '@nestjs/testing';
import { AuditReportsService } from './audit-reports.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditReport } from './entities/audit-report.entity';
import { ReportDistribution } from './entities/report-distribution.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import { AuditSample } from '../audit-findings/entities/audit-sample.entity';
import { TemplateEngineService } from '../template-engine/template-engine.service';

import { AuditReportsExportService } from './audit-reports-export.service';

describe('AuditReportsService', () => {
  let service: AuditReportsService;

  const mockAuditReportRepo = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockFindingRepo = {
    find: jest.fn(),
  };

  const mockRecRepo = {
    find: jest.fn(),
  };

  const mockSampleRepo = {
    find: jest.fn(),
  };

  const mockDistRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto) => (Array.isArray(dto) ? dto.map((d, i) => ({ ...d, id: i + 1 })) : { ...dto, id: 1 })),
    save: jest.fn((entity) => Promise.resolve(entity)),
  };

  const mockTemplateEngineService = {
    getStaticTemplate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditReportsService,
        AuditReportsExportService,
        {
          provide: getRepositoryToken(AuditReport),
          useValue: mockAuditReportRepo,
        },
        {
          provide: getRepositoryToken(AuditFinding),
          useValue: mockFindingRepo,
        },
        { provide: getRepositoryToken(Recommendation), useValue: mockRecRepo },
        { provide: getRepositoryToken(AuditSample), useValue: mockSampleRepo },
        { provide: getRepositoryToken(ReportDistribution), useValue: mockDistRepo },
        { provide: TemplateEngineService, useValue: mockTemplateEngineService },
      ],
    }).compile();

    service = module.get<AuditReportsService>(AuditReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateWord with MB01B_DVKD template', () => {
    it('should generate a valid Word document Buffer for Business Unit (MB01B)', async () => {
      const mockDvkdReport = {
        id: 151,
        title: 'Báo cáo Kiểm toán Chi nhánh Đắk Lắk',
        reportTemplateType: 'MB01B_DVKD',
        branchName: 'ĐẮK LẮK',
        branchCode: 'VN0013200',
        reportNo: '151/2026/BCKT-IA',
        date: '09/07/2026',
        branchRatingCreditPersonal: 'Cần cải thiện',
        branchRatingCreditCorporate: 'Cần cải thiện',
        branchRatingNonCredit: 'Cần cải thiện',
        branchRatingPgdbd: 'Cần cải thiện',
        branchOverallRating: 'Cần cải thiện',
        engagement: {
          id: 10,
          name: 'KTNB CN Đắk Lắk 2026',
          branchName: 'ĐẮK LẮK',
          branchCode: 'VN0013200',
          decisionNo: '87/2026/QĐ-IA',
          decisionDate: '07/05/2026',
          reportTemplateType: 'MB01B_DVKD',
        },
        findings: [
          {
            id: 1,
            findingCode: 'TD-01',
            findingTitle:
              'Định giá TSBĐ vượt thẩm quyền và chưa thu thập đủ chứng từ',
            businessModule: 'TinDung_KHCN',
            riskLevel: 'High',
            sampleViolationRatio: '38/56 KH (67.8%)',
            subUnitName: 'Trụ sở CN & PGD Buôn Hồ',
            violationHistory: 'LapLai',
            violationNature: 'LapLaiNhieuKH',
            remediationDays: 30,
            condition: 'Có 38/56 KH chưa hoàn tất đăng ký giao dịch bảo đảm.',
            cause: 'Cán bộ chưa tuân thủ quy định.',
          },
          {
            id: 2,
            findingCode: 'PTD-01',
            findingTitle: 'Chưa kiểm kê kho quỹ định kỳ theo quy trình',
            businessModule: 'PhiTinDung',
            riskLevel: 'Medium',
            sampleViolationRatio: '2/5 PGD',
            subUnitName: 'PGD Ea Kar',
            violationHistory: 'LanDau',
            violationNature: 'CaBiet',
            remediationDays: 15,
            condition: 'Biên bản kiểm kê thiếu chữ ký thủ quỹ.',
          },
        ],
        recommendations: [
          {
            id: 1,
            recommendation: 'Họp kiểm điểm và rà soát các hồ sơ tương tự.',
            legacyDepartment: 'Chi nhánh Đắk Lắk',
            dueDate: '30/08/2026',
          },
        ],
      };

      mockAuditReportRepo.findOne.mockResolvedValue(mockDvkdReport);
      mockFindingRepo.find.mockResolvedValue(mockDvkdReport.findings);
      mockRecRepo.find.mockResolvedValue(mockDvkdReport.recommendations);

      const buffer = await service.generateWord(151);

      expect(buffer).toBeDefined();
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(1000);
    });

    it('should generate a valid Word document Buffer for Head Office (MB03B)', async () => {
      const mockHscReport = {
        id: 174,
        title: 'Báo cáo Kiểm toán Nghiệp vụ Thẻ',
        reportTemplateType: 'MB03B_HSC',
        targetAuditProcess: 'Thẻ tín dụng',
        reportNo: '174/2026/BCKT-IA',
        date: '20/08/2026',
        issueLocation: 'Hà Nội',
        auditRating: 'Cần cải thiện',
        engagement: {
          id: 12,
          name: 'Kiểm toán Nghiệp vụ Thẻ 2026',
          decisionNo: '53/2026/QĐ-IA',
          decisionDate: '06/03/2026',
          reportTemplateType: 'MB03B_HSC',
          ownerTeam: 'PKT_HoiSo',
        },
        findings: [
          {
            id: 1,
            findingCode: 'THE-01',
            findingTitle: 'Chưa đối soát giao dịch thẻ hoàn trả kịp thời',
            findingCategoryGroup: 'HSC',
            riskLevel: 'High',
            affectedScope: 'Khối NHBL, Khối Vận hành',
            condition: 'Có độ trễ 3 ngày trong hạch toán.',
          },
        ],
        recommendations: [],
      };

      mockAuditReportRepo.findOne.mockResolvedValue(mockHscReport);
      mockFindingRepo.find.mockResolvedValue(mockHscReport.findings);
      mockRecRepo.find.mockResolvedValue([]);

      const buffer = await service.generateWord(174);

      expect(buffer).toBeDefined();
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(1000);
    });
  });

  describe('generatePdf with MB01B_DVKD and MB03B_HSC templates', () => {
    it('should generate a valid PDF document Buffer for MB01B (Business Unit)', async () => {
      const mockDvkdReport = {
        id: 151,
        title: 'Báo cáo Kiểm toán Chi nhánh Đắk Lắk',
        reportTemplateType: 'MB01B_DVKD',
        branchName: 'ĐẮK LẮK',
        branchCode: 'VN0013200',
        reportCode: '151/2026/BC-KTNB',
        date: '2026-07-09',
        branchRatingCreditPersonal: 'Cần cải thiện',
        branchRatingCreditCorporate: 'Cần cải thiện',
        branchRatingNonCredit: 'Cần cải thiện',
        branchRatingPgdbd: 'Cần cải thiện',
        auditRating: 'Hạng 3 - Trung bình',
        findings: [
          {
            id: 1,
            findingCode: 'TD-01',
            findingTitle: 'Định giá TSBĐ vượt thẩm quyền',
            businessModule: 'TinDung_KHCN',
            riskLevel: 'High',
            sampleViolationRatio: '38/56 KH',
            subUnitName: 'PGD Buôn Hồ',
            condition: 'Chưa hoàn tất ĐKGDBĐ',
            cause: 'Thiếu kiểm soát',
            recommendation: 'Chấn chỉnh ngay',
          },
        ],
      };

      mockAuditReportRepo.findOne.mockResolvedValue(mockDvkdReport);
      mockFindingRepo.find.mockResolvedValue(mockDvkdReport.findings);

      const buffer = await service.generatePdf(151);

      expect(buffer).toBeDefined();
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(500);
      expect(buffer.toString('utf-8', 0, 5)).toContain('%PDF');
    });

    it('should generate a valid PDF document Buffer for MB03B (Head Office)', async () => {
      const mockHscReport = {
        id: 174,
        title: 'Báo cáo Kiểm toán Nghiệp vụ Thẻ',
        reportTemplateType: 'MB03B_HSC',
        ownerTeam: 'KTNB_HSC',
        reportCode: '174/2026/BC-KTNB',
        date: '2026-08-20',
        auditRating: 'Hạng 3 - Trung bình',
        findings: [
          {
            id: 1,
            findingCode: 'THE-01',
            findingTitle: 'Chưa đối soát giao dịch thẻ',
            riskLevel: 'High',
            condition: 'Độ trễ đối soát',
            cause: 'Hệ thống chậm',
            recommendation: 'Nâng cấp đối soát tự động',
          },
        ],
      };

      mockAuditReportRepo.findOne.mockResolvedValue(mockHscReport);
      mockFindingRepo.find.mockResolvedValue(mockHscReport.findings);

      const buffer = await service.generatePdf(174);

      expect(buffer).toBeDefined();
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(500);
      expect(buffer.toString('utf-8', 0, 5)).toContain('%PDF');
    });
  });

  describe('Report Distribution (IIA Standard 6.3)', () => {
    it('should distribute report to multiple recipients', async () => {
      mockAuditReportRepo.findOne.mockResolvedValue({ id: 1, title: 'Báo cáo Kiểm toán' });
      const recipients = [
        { recipientName: 'GĐ Chi nhánh', recipientRole: 'BranchManager', organizationUnit: 'CN Hà Nội' },
        { recipientName: 'Trưởng BKS', recipientRole: 'SupervisoryBoard' },
      ];

      const res = await service.distributeReport(1, recipients);
      expect(mockDistRepo.create).toHaveBeenCalled();
      expect(mockDistRepo.save).toHaveBeenCalled();
      expect(res).toHaveLength(2);
    });

    it('should get distributions for a report', async () => {
      mockDistRepo.find.mockResolvedValue([{ id: 1, reportId: 1, status: 'Sent' }]);

      const res = await service.getDistributions(1);
      expect(res).toHaveLength(1);
      expect(mockDistRepo.find).toHaveBeenCalledWith({
        where: { reportId: 1 },
        order: { sentAt: 'DESC' },
      });
    });

    it('should mark report distribution as Read', async () => {
      mockDistRepo.findOne.mockResolvedValue({ id: 1, status: 'Sent' });

      const res = await service.markReportRead(1);
      expect(res.status).toBe('Read');
      expect(res.readAt).toBeDefined();
      expect(mockDistRepo.save).toHaveBeenCalled();
    });

    it('should acknowledge report with recipient feedback', async () => {
      mockDistRepo.findOne.mockResolvedValue({ id: 1, status: 'Read' });

      const res = await service.acknowledgeReport(1, 'Đơn vị đã tiếp thu toàn bộ kiến nghị');
      expect(res.status).toBe('Acknowledged');
      expect(res.acknowledgedAt).toBeDefined();
      expect(res.acknowledgementNotes).toBe('Đơn vị đã tiếp thu toàn bộ kiến nghị');
      expect(mockDistRepo.save).toHaveBeenCalled();
    });

    it('should calculate distribution statistics correctly', async () => {
      mockDistRepo.find.mockResolvedValue([
        { id: 1, status: 'Acknowledged' },
        { id: 2, status: 'Read' },
        { id: 3, status: 'Sent' },
      ]);

      const stats = await service.getDistributionStats(1);
      expect(stats.total).toBe(3);
      expect(stats.read).toBe(2); // Read or Acknowledged
      expect(stats.acknowledged).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.readRate).toBe(67);
      expect(stats.ackRate).toBe(33);
    });
  });

  describe('IIA Standard 15.1: Statement of Conformance', () => {
    it('should include IIA 2024 & TT13 conformance statement when creating report from engagement', async () => {
      mockFindingRepo.find.mockResolvedValue([
        { id: 1, riskLevel: 'Medium' },
      ]);
      mockRecRepo.find.mockResolvedValue([]);
      mockAuditReportRepo.create.mockImplementation((dto) => dto);
      mockAuditReportRepo.save.mockImplementation((dto) => Promise.resolve({ id: 1, ...dto }));

      const res = await service.autoGenerate(
        10,
        'Báo cáo KTNB Chi nhánh 2026',
        'Kế hoạch 2026',
      );

      expect(res.conformanceStatement).toContain('IIA Global Internal Audit Standards 2024');
      expect(res.conformanceStatement).toContain('Thông tư 13/2018/TT-NHNN');
      expect(res.hasNonConformance).toBe(false);
    });
  });
});
