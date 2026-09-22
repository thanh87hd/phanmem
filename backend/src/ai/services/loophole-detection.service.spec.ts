import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoopholeDetectionService } from './loophole-detection.service';
import { ProcessLoophole } from '../entities/process-loophole.entity';
import { AuditFinding } from '../../audit-findings/entities/audit-finding.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationsService } from '../../notifications/notifications.service';

describe('LoopholeDetectionService', () => {
  let service: LoopholeDetectionService;
  let loopholeRepo: any;
  let findingRepo: any;
  let userRepo: any;
  let notificationsService: any;

  beforeEach(async () => {
    loopholeRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((dto) => ({ ...dto, id: 1 })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    findingRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    userRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    notificationsService = {
      broadcast: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoopholeDetectionService,
        {
          provide: getRepositoryToken(ProcessLoophole),
          useValue: loopholeRepo,
        },
        { provide: getRepositoryToken(AuditFinding), useValue: findingRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<LoopholeDetectionService>(LoopholeDetectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeProcessLoopholes', () => {
    it('should return loopholes sorted by count descending', async () => {
      loopholeRepo.find.mockResolvedValue([
        { id: 1, title: 'Thiếu chứng từ chi', count: 5 },
      ]);
      const result = await service.analyzeProcessLoopholes();
      expect(result).toHaveLength(1);
      expect(loopholeRepo.find).toHaveBeenCalledWith({
        order: { count: 'DESC' },
      });
    });
  });

  describe('runAiLoopholeDetection', () => {
    it('should detect clusters with >= 2 findings and create loopholes', async () => {
      const mockFindings = [
        {
          findingTitle: 'Sai sót chứng từ giải ngân',
          rootCauseCategory: 'Vận hành',
          riskLevel: 'High',
          criteria: 'Quy trình TD01',
          engagement: { name: 'KT Đợt 1' },
          createdAt: new Date(),
        },
        {
          findingTitle: 'Sai sót chứng từ giải ngân',
          rootCauseCategory: 'Vận hành',
          riskLevel: 'High',
          criteria: 'Quy trình TD01',
          engagement: { name: 'KT Đợt 2' },
          createdAt: new Date(),
        },
        {
          findingTitle: 'Lỗi đơn lẻ',
          rootCauseCategory: 'Khác',
          riskLevel: 'Low',
          criteria: 'None',
          engagement: { name: 'KT Đợt 1' },
          createdAt: new Date(),
        },
      ];

      findingRepo.find.mockResolvedValue(mockFindings);
      loopholeRepo.findOne.mockResolvedValue(null);

      const result = await service.runAiLoopholeDetection();
      expect(result.success).toBe(true);
      expect(result.detected).toBe(1);
      expect(loopholeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Sai sót chứng từ giải ngân',
          count: 2,
          severity: 'Medium',
          status: 'Pending',
        }),
      );
      expect(loopholeRepo.save).toHaveBeenCalled();
    });

    it('should update existing loophole and mark critical when count >= 5', async () => {
      const mockFindings = Array.from({ length: 6 }).map(() => ({
        findingTitle: 'Không đối chiếu số dư',
        rootCauseCategory: 'Kiểm soát',
        riskLevel: 'High',
        criteria: 'Quy trình KT02',
        engagement: { name: 'KT Demo' },
        createdAt: new Date(),
      }));

      findingRepo.find.mockResolvedValue(mockFindings);
      loopholeRepo.findOne.mockResolvedValue({
        id: 10,
        title: 'Không đối chiếu số dư',
      });

      const result = await service.runAiLoopholeDetection();
      expect(result.success).toBe(true);
      expect(loopholeRepo.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          title: 'Không đối chiếu số dư',
          count: 6,
          severity: 'Critical',
          loopholeType: 'Lỗ hổng Thiết kế Quy trình',
        }),
      );
    });
  });

  describe('approveLoophole and rejectLoophole', () => {
    it('should return false if loophole to approve not found', async () => {
      loopholeRepo.findOne.mockResolvedValue(null);
      const result = await service.approveLoophole(999, 'admin');
      expect(result.success).toBe(false);
    });

    it('should approve loophole and broadcast alert to admin / department lead users', async () => {
      loopholeRepo.findOne.mockResolvedValue({
        id: 1,
        title: 'Thiếu chữ ký phê duyệt cấp tín dụng',
        severity: 'Critical',
      });

      userRepo.find.mockResolvedValue([
        { id: 10, jobTitle: 'Trưởng ban Kiểm soát', role: { name: 'Admin' } },
        {
          id: 11,
          jobTitle: 'Chuyên viên kiểm toán',
          role: { name: 'Auditor' },
        },
      ]);

      const result = await service.approveLoophole(1, 'CAE Officer');
      expect(result.success).toBe(true);
      expect(loopholeRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'Approved',
          approvedBy: 'CAE Officer',
        }),
      );
      expect(notificationsService.broadcast).toHaveBeenCalledWith(
        [10],
        expect.objectContaining({
          title: expect.stringContaining('CẢNH BÁO LỖ HỔNG QUY TRÌNH'),
          type: 'Alert',
        }),
      );
    });

    it('should reject loophole successfully', async () => {
      const result = await service.rejectLoophole(1);
      expect(result.success).toBe(true);
      expect(loopholeRepo.update).toHaveBeenCalledWith(1, {
        status: 'Rejected',
      });
    });
  });

  describe('getMonthlyLoopholeReport', () => {
    it('should aggregate approved loopholes for specified month and year', async () => {
      const mockApproved = [
        { id: 1, category: 'Tín dụng', severity: 'Critical' },
        { id: 2, category: 'Tín dụng', severity: 'High' },
        { id: 3, category: 'CNTT', severity: 'Medium' },
      ];
      loopholeRepo.find.mockResolvedValue(mockApproved);

      const report = await service.getMonthlyLoopholeReport(2026, 3);
      expect(report.period).toBe('3/2026');
      expect(report.stats.totalApproved).toBe(3);
      expect(report.stats.criticalCount).toBe(1);
      expect(report.stats.highCount).toBe(1);
      expect(report.stats.byCategory['Tín dụng']).toBe(2);
      expect(report.stats.byCategory['CNTT']).toBe(1);
    });
  });
});
