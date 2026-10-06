import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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
    update: jest.fn(),
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

  describe('TC-REP-03: Trình & Phê duyệt Phát hành Báo cáo KT (3 Cấp)', () => {
    // Bản ghi "trong DB" được mô phỏng để changeStatus() đọc lại qua findOne() và update() ghi vào
    let storedReport: any;

    beforeEach(() => {
      jest.clearAllMocks();
      storedReport = {
        id: 151,
        title: 'Báo cáo KTNB Chi nhánh Hà Nội 2026',
        status: 'Draft',
        managerReviewCount: 0,
        reviewHistory: [],
      };
      mockAuditReportRepo.findOne.mockImplementation(() =>
        Promise.resolve({ ...storedReport }),
      );
      mockAuditReportRepo.update.mockImplementation(
        (id: number, data: any) => {
          Object.assign(storedReport, data);
          return Promise.resolve({ affected: 1 });
        },
      );
    });

    it('TC-REP-03: đi hết luồng 3 cấp Draft → PendingReview → Reviewed → Issued và đóng dấu issuedBy/date khi phát hành', async () => {
      // Cấp 1: Trưởng đoàn (diepnx) trình Lãnh đạo Phòng
      await service.changeStatus(151, 'PendingReview', 20, 'diepnx');
      expect(mockAuditReportRepo.update).toHaveBeenNthCalledWith(1, 151, {
        status: 'PendingReview',
      });
      // Trình duyệt chưa phải là 1 lần "review" của Lãnh đạo Phòng
      expect(storedReport.managerReviewCount).toBe(0);
      expect(storedReport.reviewHistory).toEqual([]);

      // Cấp 2: Lãnh đạo Phòng (luongnt2) duyệt → trình Lãnh đạo Khối
      const reviewed = await service.changeStatus(151, 'Reviewed', 21, 'luongnt2');
      const reviewData = mockAuditReportRepo.update.mock.calls[1][1];
      expect(reviewData.status).toBe('Reviewed');
      expect(reviewData.managerReviewCount).toBe(1);
      expect(reviewData.reviewHistory).toHaveLength(1);
      expect(reviewData.reviewHistory[0]).toMatchObject({
        reviewerId: 21,
        reviewerName: 'luongnt2',
        role: 'Lãnh đạo Phòng / Khối KTNB',
        fromStatus: 'PendingReview',
        toStatus: 'Reviewed',
        reviewNotes: 'Đã duyệt đạt yêu cầu',
      });
      expect(reviewData.reviewHistory[0].reviewedAt).toEqual(expect.any(String));
      expect(reviewed.status).toBe('Reviewed');

      // Cấp 3: Lãnh đạo Khối (hiepnt) phê duyệt & phát hành
      const issued = await service.changeStatus(151, 'Issued', 22, 'hiepnt');
      const issueData = mockAuditReportRepo.update.mock.calls[2][1];
      expect(issueData.status).toBe('Issued');
      expect(issueData.issuedBy).toBe('hiepnt');
      expect(issueData.date).toBe(new Date().toISOString().split('T')[0]);
      // Phát hành không tính là một lần review của Lãnh đạo Phòng
      expect(issueData.managerReviewCount).toBeUndefined();
      expect(issueData.reviewHistory).toBeUndefined();

      expect(issued.status).toBe('Issued');
      expect(issued.issuedBy).toBe('hiepnt');
      expect(mockAuditReportRepo.update).toHaveBeenCalledTimes(3);
    });

    it('TC-REP-03: Lãnh đạo Phòng trả báo cáo về Draft ghi history "Yêu cầu đoàn chỉnh sửa lại Báo cáo"', async () => {
      storedReport.status = 'PendingReview';
      storedReport.managerReviewCount = 1;
      storedReport.reviewHistory = [
        {
          reviewerId: 21,
          reviewerName: 'luongnt2',
          role: 'Lãnh đạo Phòng / Khối KTNB',
          reviewedAt: '2026-07-01T08:00:00.000Z',
          fromStatus: 'PendingReview',
          toStatus: 'Reviewed',
          reviewNotes: 'Đã duyệt đạt yêu cầu',
        },
      ];

      await service.changeStatus(151, 'Draft', 21, 'luongnt2');

      const data = mockAuditReportRepo.update.mock.calls[0][1];
      expect(data.status).toBe('Draft');
      expect(data.managerReviewCount).toBe(2);
      expect(data.reviewHistory).toHaveLength(2);
      expect(data.reviewHistory[1]).toMatchObject({
        reviewerId: 21,
        reviewerName: 'luongnt2',
        fromStatus: 'PendingReview',
        toStatus: 'Draft',
        reviewNotes: 'Yêu cầu đoàn chỉnh sửa lại Báo cáo',
      });
    });

    it('TC-REP-03: chặn nhảy cóc Draft → Issued (sai quy trình 3 cấp)', async () => {
      await expect(
        service.changeStatus(151, 'Issued', 22, 'hiepnt'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.changeStatus(151, 'Issued', 22, 'hiepnt'),
      ).rejects.toThrow(
        'Không thể chuyển từ "Draft" sang "Issued". Chỉ cho phép: PendingReview',
      );

      expect(mockAuditReportRepo.update).not.toHaveBeenCalled();
      expect(storedReport.status).toBe('Draft');
    });

    it('TC-REP-03: báo cáo "Đã phát hành (Issued)" bị khóa luồng - không quay lại Draft/Reviewed, chỉ cho phép Archived', async () => {
      storedReport.status = 'Issued';
      storedReport.issuedBy = 'hiepnt';
      storedReport.date = '2026-07-09';

      await expect(service.changeStatus(151, 'Draft')).rejects.toThrow(
        'Không thể chuyển từ "Issued" sang "Draft". Chỉ cho phép: Archived',
      );
      await expect(service.changeStatus(151, 'Reviewed')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.changeStatus(151, 'PendingReview')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockAuditReportRepo.update).not.toHaveBeenCalled();
      expect(storedReport.status).toBe('Issued');

      // Chỉ còn bước lưu trữ (Archived) là hợp lệ
      await service.changeStatus(151, 'Archived', 22, 'hiepnt');
      expect(mockAuditReportRepo.update).toHaveBeenCalledWith(151, {
        status: 'Archived',
      });
    });

    it('TC-REP-03: báo cáo không tồn tại → NotFoundException, không ghi DB', async () => {
      mockAuditReportRepo.findOne.mockResolvedValue(null);

      await expect(service.changeStatus(999, 'PendingReview')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.changeStatus(999, 'PendingReview')).rejects.toThrow(
        'Báo cáo không tồn tại',
      );
      expect(mockAuditReportRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('TC-REP-03: Khóa chỉnh sửa vĩnh viễn báo cáo đã phát hành/bảo toàn (update)', () => {
    let storedReport: any;

    beforeEach(() => {
      jest.clearAllMocks();
      storedReport = {
        id: 151,
        title: 'Báo cáo KTNB Chi nhánh Hà Nội 2026',
        status: 'Draft',
      };
      mockAuditReportRepo.findOne.mockImplementation(() =>
        Promise.resolve({ ...storedReport }),
      );
      mockAuditReportRepo.update.mockImplementation((id: number, data: any) => {
        Object.assign(storedReport, data);
        return Promise.resolve({ affected: 1 });
      });
    });

    it('TC-REP-03: chặn chỉnh sửa nội dung báo cáo đã phát hành (Issued) và không ghi gì vào CSDL', async () => {
      storedReport.status = 'Issued';

      const err = await service
        .update(151, { title: 'Sửa trộm sau khi phát hành' } as any)
        .catch((e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toBe(
        'Báo cáo ở trạng thái "Issued" đã được phát hành/bảo toàn, không thể chỉnh sửa nội dung.',
      );
      expect(mockAuditReportRepo.update).not.toHaveBeenCalled();
      expect(storedReport.title).toBe('Báo cáo KTNB Chi nhánh Hà Nội 2026');
    });

    it('TC-REP-03: chặn chỉnh sửa nội dung báo cáo đã bảo toàn (Archived) và không ghi gì vào CSDL', async () => {
      storedReport.status = 'Archived';

      const err = await service
        .update(151, { overallConclusion: 'Sửa trộm sau khi lưu trữ' } as any)
        .catch((e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toBe(
        'Báo cáo ở trạng thái "Archived" đã được phát hành/bảo toàn, không thể chỉnh sửa nội dung.',
      );
      expect(mockAuditReportRepo.update).not.toHaveBeenCalled();
      expect(storedReport.overallConclusion).toBeUndefined();
    });

    it('TC-REP-03: vẫn cho phép chỉnh sửa báo cáo Draft', async () => {
      const res = await service.update(151, {
        title: 'Bản nháp chỉnh sửa',
      } as any);

      expect(mockAuditReportRepo.update).toHaveBeenCalledTimes(1);
      expect(mockAuditReportRepo.update).toHaveBeenCalledWith(151, {
        title: 'Bản nháp chỉnh sửa',
      });
      expect(res.title).toBe('Bản nháp chỉnh sửa');
    });

    it('TC-REP-03: vẫn cho phép chỉnh sửa báo cáo Reviewed (chờ phát hành)', async () => {
      storedReport.status = 'Reviewed';

      const res = await service.update(151, {
        auditRating: 'Hạng 3',
      } as any);

      expect(mockAuditReportRepo.update).toHaveBeenCalledWith(151, {
        auditRating: 'Hạng 3',
      });
      expect(res.auditRating).toBe('Hạng 3');
    });

    it('TC-REP-03: luồng phát hành → lưu trữ (Issued → Archived) vẫn hoạt động, sau đó nội dung bị khóa', async () => {
      storedReport.status = 'Issued';
      storedReport.issuedBy = 'hiepnt';
      storedReport.date = '2026-07-09';

      const archived = await service.changeStatus(
        151,
        'Archived',
        22,
        'hiepnt',
      );

      expect(mockAuditReportRepo.update).toHaveBeenCalledWith(151, {
        status: 'Archived',
      });
      expect(archived.status).toBe('Archived');

      // Sau khi bảo toàn, báo cáo vẫn bất biến với luồng chỉnh sửa thường
      mockAuditReportRepo.update.mockClear();
      const err = await service
        .update(151, { title: 'Sửa sau lưu trữ' } as any)
        .catch((e) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect(mockAuditReportRepo.update).not.toHaveBeenCalled();
    });

    it('TC-REP-03: cờ opt-in nội bộ cho phép luồng kỹ thuật ghi trên báo cáo Issued', async () => {
      storedReport.status = 'Issued';

      await service.update(
        151,
        { exportStatus: 'Completed' } as any,
        { allowLockedReport: true },
      );

      expect(mockAuditReportRepo.update).toHaveBeenCalledWith(151, {
        exportStatus: 'Completed',
      });
    });

    it('TC-REP-03: PATCH không được phép ĐỔI trạng thái (chặn nhảy thẳng Draft → Issued, bỏ qua 3 cấp phê duyệt)', async () => {
      storedReport.status = 'Draft';

      const err = await service
        .update(151, { title: 'Bản nháp', status: 'Issued' } as any)
        .catch((e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toContain('Không thể đổi trạng thái báo cáo');
      expect(err.message).toContain('Draft → Issued');
      expect(mockAuditReportRepo.update).not.toHaveBeenCalled();
    });

    it('TC-REP-03: PATCH gửi kèm status KHÔNG ĐỔI (frontend echo lại) vẫn sửa nội dung bình thường', async () => {
      storedReport.status = 'Reviewed';

      await service.update(151, {
        title: 'Chỉnh sửa nội dung',
        status: 'Reviewed',
      } as any);

      expect(mockAuditReportRepo.update).toHaveBeenCalledWith(151, {
        title: 'Chỉnh sửa nội dung',
        status: 'Reviewed',
      });
    });
  });

  describe('TC-REP-03: Ký số báo cáo đã phát hành (processDigitalSignature)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('TC-REP-03: chặn ký số khi báo cáo chưa phát hành (Reviewed ≠ Issued)', async () => {
      mockAuditReportRepo.findOne.mockResolvedValue({
        id: 151,
        title: 'Báo cáo KTNB Chi nhánh Hà Nội 2026',
        status: 'Reviewed',
        isSigned: false,
      });

      await expect(
        service.processDigitalSignature(151, 'hiepnt'),
      ).rejects.toThrow('Chỉ có thể ký số báo cáo đã phát hành (Issued)');
      expect(mockAuditReportRepo.update).not.toHaveBeenCalled();
    });

    it('TC-REP-03: chặn ký số lần thứ hai trên cùng báo cáo', async () => {
      mockAuditReportRepo.findOne.mockResolvedValue({
        id: 151,
        title: 'Báo cáo KTNB Chi nhánh Hà Nội 2026',
        status: 'Issued',
        isSigned: true,
      });

      await expect(
        service.processDigitalSignature(151, 'hiepnt'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.processDigitalSignature(151, 'hiepnt'),
      ).rejects.toThrow('Báo cáo đã được ký số trước đó');
      expect(mockAuditReportRepo.update).not.toHaveBeenCalled();
    });

    it('TC-REP-03: phát hành xong ký số thành công, ghi isSigned/signature/signedAt vào báo cáo', async () => {
      jest.useFakeTimers();
      const issuedReport = {
        id: 151,
        title: 'Báo cáo KTNB Chi nhánh Hà Nội 2026',
        status: 'Issued',
        isSigned: false,
      };
      const stored = { ...issuedReport };
      mockAuditReportRepo.findOne.mockImplementation(() =>
        Promise.resolve({ ...stored }),
      );
      mockAuditReportRepo.update.mockImplementation(
        (id: number, data: any) => {
          Object.assign(stored, data);
          return Promise.resolve({ affected: 1 });
        },
      );

      const pending = service.processDigitalSignature(151, 'hiepnt');
      // Nhường microtask để service kịp gọi findOne() và đăng ký setTimeout giả lập 5s
      await Promise.resolve();
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(5000);
      const res = await pending;

      expect(mockAuditReportRepo.update).toHaveBeenCalledTimes(1);
      const data = mockAuditReportRepo.update.mock.calls[0][1];
      expect(data.isSigned).toBe(true);
      expect(data.signedAt).toEqual(expect.any(Date));
      expect(data.signature).toContain('DIGITAL_SIGNATURE_151_');
      expect(data.signature).toContain(
        Buffer.from(issuedReport.title).toString('base64').substring(0, 20),
      );

      expect(res.isSigned).toBe(true);
      expect(stored.signedAt).toEqual(expect.any(Date));
    }, 15000);
  });

  describe('TC-REP-01: Tổng Hợp Dự Thảo Báo Cáo Kiểm Toán (autoGenerate)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockAuditReportRepo.create.mockImplementation((dto: any) => dto);
      mockAuditReportRepo.save.mockImplementation((dto: any) =>
        Promise.resolve({ id: 900, ...dto }),
      );
    });

    it('TC-REP-01: tổng hợp đúng số phát hiện, phân bổ mức rủi ro và số kiến nghị khớp phát hiện', async () => {
      const findings = [
        {
          id: 1,
          findingTitle: 'PH-01 Định giá TSBĐ vượt thẩm quyền',
          riskLevel: 'Critical',
        },
        {
          id: 2,
          findingTitle: 'PH-02 Không kiểm kê kho quỹ định kỳ',
          riskLevel: 'High',
        },
        {
          id: 3,
          findingTitle: 'PH-03 Chưa đối soát giao dịch thẻ',
          riskLevel: 'High',
        },
        {
          id: 4,
          findingTitle: 'PH-04 Thiếu chữ ký thủ quỹ',
          riskLevel: 'Medium',
        },
        { id: 5, findingTitle: 'PH-05 Lưu hồ sơ chậm', riskLevel: 'Low' },
      ];
      mockFindingRepo.find.mockResolvedValue(findings);
      mockRecRepo.find.mockResolvedValue([
        {
          id: 1,
          finding: 'PH-01 Định giá TSBĐ vượt thẩm quyền',
          recommendation: 'Rà soát toàn bộ hồ sơ TSBĐ tương tự',
        },
        {
          id: 2,
          finding: 'PH-03 Chưa đối soát giao dịch thẻ',
          recommendation: 'Nâng cấp đối soát tự động',
        },
        {
          id: 3,
          finding: 'PH-99 Phát hiện của cuộc kiểm toán khác',
          recommendation: 'Không thuộc cuộc kiểm toán này',
        },
      ]);

      const res = await service.autoGenerate(
        10,
        'Báo cáo KTNB Chi nhánh Hà Nội',
        'Kế hoạch KTNB 2026',
      );

      expect(mockFindingRepo.find).toHaveBeenCalledWith({
        where: { engagementId: 10 },
        order: { riskLevel: 'ASC' },
      });

      const payload = mockAuditReportRepo.create.mock.calls[0][0];
      expect(payload.engagementId).toBe(10);
      expect(payload.title).toBe('Báo cáo KTNB Chi nhánh Hà Nội');
      expect(payload.plan).toBe('Kế hoạch KTNB 2026');
      expect(payload.status).toBe('Draft');
      // 5 phát hiện; chỉ 2/3 kiến nghị khớp tiêu đề phát hiện của cuộc kiểm toán này
      expect(payload.executiveSummary).toContain(
        'Tổng số có 5 phát hiện rủi ro và 2 kiến nghị được đưa ra',
      );
      expect(payload.executiveSummary).toContain(
        '1 lỗi mức độ Nghiêm trọng và 2 lỗi mức độ Cao',
      );
      // 1 Critical → xếp hạng thấp nhất (Hạng 5)
      expect(payload.auditRating).toBe('Hạng 5');
      expect(payload.overallConclusion).toContain('Mức Rất Cao (Hạng 5)');
      expect(payload.hasNonConformance).toBe(false);

      expect(mockAuditReportRepo.save).toHaveBeenCalledWith(payload);
      expect(res.id).toBe(900);
      expect(res.status).toBe('Draft');
    });

    it('TC-REP-01: xếp Hạng 4 khi có từ 3 phát hiện rủi ro Cao và không có Nghiêm trọng', async () => {
      mockFindingRepo.find.mockResolvedValue([
        { id: 1, findingTitle: 'PH-01', riskLevel: 'High' },
        { id: 2, findingTitle: 'PH-02', riskLevel: 'High' },
        { id: 3, findingTitle: 'PH-03', riskLevel: 'High' },
        { id: 4, findingTitle: 'PH-04', riskLevel: 'Medium' },
      ]);
      mockRecRepo.find.mockResolvedValue([]);

      await service.autoGenerate(11, 'Báo cáo KTNB 2026');

      const payload = mockAuditReportRepo.create.mock.calls[0][0];
      expect(payload.plan).toBe('');
      expect(payload.executiveSummary).toContain(
        'Tổng số có 4 phát hiện rủi ro và 0 kiến nghị được đưa ra',
      );
      expect(payload.executiveSummary).toContain(
        '0 lỗi mức độ Nghiêm trọng và 3 lỗi mức độ Cao',
      );
      expect(payload.auditRating).toBe('Hạng 4');
      expect(payload.overallConclusion).toContain('Mức Cao (Hạng 4)');
    });

    it('TC-REP-01: so khớp kiến nghị theo tiêu đề ĐÃ CHUẨN HOÁ (không lệch vì hoa/thường, khoảng trắng, dấu)', async () => {
      mockFindingRepo.find.mockResolvedValue([
        { id: 1, findingTitle: 'PH-01 Định giá TSBĐ', riskLevel: 'High' },
        { id: 2, findingTitle: 'PH-02 Thiếu chữ ký', riskLevel: 'Medium' },
      ]);
      mockRecRepo.find.mockResolvedValue([
        { id: 1, finding: 'PH-01 Định giá TSBĐ', recommendation: 'Khớp chính xác' },
        {
          id: 2,
          finding: '  ph-01   định giá tsbd ',
          recommendation: 'Lệch hoa/thường + khoảng trắng + dấu ⇒ VẪN phải được tính',
        },
        { id: 3, finding: 'PH-03 Không tồn tại', recommendation: 'Không khớp' },
      ]);

      await service.autoGenerate(12, 'Báo cáo KTNB 2026');

      const payload = mockAuditReportRepo.create.mock.calls[0][0];
      // Đã sửa: kiến nghị lệch hoa/thường/khoảng trắng/dấu vẫn được tính (trước đây bị bỏ sót).
      expect(payload.executiveSummary).toContain(
        'Tổng số có 2 phát hiện rủi ro và 2 kiến nghị được đưa ra',
      );
      expect(payload.auditRating).toBe('Hạng 3');
      expect(payload.overallConclusion).toContain('Hạng 3');
    });

    it('TC-REP-01: chỉ truy vấn kiến nghị thuộc các phát hiện của cuộc kiểm toán (không nạp toàn bộ CSDL)', async () => {
      mockFindingRepo.find.mockResolvedValue([
        { id: 7, findingTitle: 'PH-07', riskLevel: 'High' },
        { id: 8, findingTitle: 'PH-08', riskLevel: 'Low' },
      ]);
      mockRecRepo.find.mockResolvedValue([]);

      await service.autoGenerate(12, 'Báo cáo KTNB 2026');

      const findArg = mockRecRepo.find.mock.calls[0]?.[0];
      expect(findArg).toBeDefined();
      // Lọc theo findingId của cuộc kiểm toán HOẶC các bản ghi cũ chưa gắn findingId.
      expect(JSON.stringify(findArg)).toContain('7');
      expect(JSON.stringify(findArg)).toContain('8');
    });

    it('TC-REP-01: xếp Hạng 2 và tóm tắt theo nhánh Trung bình khi chỉ có rủi ro Trung bình', async () => {
      mockFindingRepo.find.mockResolvedValue([
        { id: 1, findingTitle: 'PH-01', riskLevel: 'Medium' },
        { id: 2, findingTitle: 'PH-02', riskLevel: 'Medium' },
      ]);
      mockRecRepo.find.mockResolvedValue([
        { id: 1, finding: 'PH-01', recommendation: 'Bổ sung kiểm soát' },
      ]);

      await service.autoGenerate(13, 'Báo cáo KTNB 2026');

      const payload = mockAuditReportRepo.create.mock.calls[0][0];
      expect(payload.executiveSummary).toContain(
        'mức độ rủi ro Trung bình (2 lỗi)',
      );
      expect(payload.executiveSummary).toContain('1 kiến nghị được đưa ra');
      expect(payload.auditRating).toBe('Hạng 2');
      expect(payload.overallConclusion).toContain('Hạng 2');
    });

    it('TC-REP-01: xếp Hạng 1 và tóm tắt nhánh Thấp khi cuộc kiểm toán không có phát hiện', async () => {
      mockFindingRepo.find.mockResolvedValue([]);
      mockRecRepo.find.mockResolvedValue([
        { id: 1, finding: 'PH-01', recommendation: 'Không có phát hiện để khớp' },
      ]);

      const res = await service.autoGenerate(14, 'Báo cáo KTNB 2026');

      const payload = mockAuditReportRepo.create.mock.calls[0][0];
      expect(payload.executiveSummary).toContain(
        'Tổng số có 0 phát hiện rủi ro và 0 kiến nghị được đưa ra',
      );
      expect(payload.executiveSummary).toContain('mức độ Thấp (0 lỗi)');
      expect(payload.auditRating).toBe('Hạng 1');
      expect(payload.overallConclusion).toContain('Hạng 1');
      expect(res.status).toBe('Draft');
    });
  });
});
