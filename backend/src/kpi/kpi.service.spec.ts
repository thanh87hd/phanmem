import { Test, TestingModule } from '@nestjs/testing';
import { KpiService } from './kpi.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditPlan } from '../audit-plans/entities/audit-plan.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import { AuditReport } from '../audit-reports/entities/audit-report.entity';
import { WorkingPaper } from '../working-papers/entities/working-paper.entity';
import { ComplianceStatus } from './entities/compliance-status.entity';
import { MasterDataChangeRequest } from '../system-management/entities/master-data-change-request.entity';

describe('KpiService', () => {
  let service: KpiService;

  const mockPlanRepo = {};
  const mockEngRepo = {
    count: jest.fn(),
  };
  const mockFindingRepo = {
    count: jest.fn(),
  };
  const mockRecRepo = {
    count: jest.fn(),
  };
  const mockReportRepo = {
    find: jest.fn(),
  };
  const mockWpRepo = {
    count: jest.fn(),
  };
  const mockComplianceRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((dto) => Promise.resolve(dto)),
  };
  const mockChangeRepo = {
    count: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KpiService,
        { provide: getRepositoryToken(AuditPlan), useValue: mockPlanRepo },
        { provide: getRepositoryToken(AuditEngagement), useValue: mockEngRepo },
        {
          provide: getRepositoryToken(AuditFinding),
          useValue: mockFindingRepo,
        },
        { provide: getRepositoryToken(Recommendation), useValue: mockRecRepo },
        { provide: getRepositoryToken(AuditReport), useValue: mockReportRepo },
        { provide: getRepositoryToken(WorkingPaper), useValue: mockWpRepo },
        {
          provide: getRepositoryToken(ComplianceStatus),
          useValue: mockComplianceRepo,
        },
        {
          provide: getRepositoryToken(MasterDataChangeRequest),
          useValue: mockChangeRepo,
        },
      ],
    }).compile();

    service = module.get<KpiService>(KpiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateKpis', () => {
    it('should calculate KPIs correctly with mock data', async () => {
      // Engagements
      mockEngRepo.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(10); // completed (100%)

      // Reports
      mockReportRepo.find.mockResolvedValue([
        {
          status: 'Issued',
          date: '2025-02-15T00:00:00Z',
          createdAt: '2025-02-05T00:00:00Z',
        },
      ]); // 10 days

      // Recommendations
      mockRecRepo.count
        .mockResolvedValueOnce(20) // total
        .mockResolvedValueOnce(18) // completed
        .mockResolvedValueOnce(2); // overdue

      // Working Papers
      mockWpRepo.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(50); // approved

      // Findings
      mockFindingRepo.count
        .mockResolvedValueOnce(0) // high/critical
        .mockResolvedValueOnce(15) // total
        .mockResolvedValueOnce(14); // confirmed

      // Emerging changes
      mockChangeRepo.count.mockResolvedValue(6);

      const kpis = await service.calculateKpis();
      expect(kpis).toHaveLength(8);

      const planComp = kpis.find((k) => k.id === 'plan_completion');
      expect(planComp?.value).toBe(100);
      expect(planComp?.status).toBe('Passed');

      const reportTime = kpis.find((k) => k.id === 'report_time');
      expect(reportTime?.value).toBe(10);
      expect(reportTime?.status).toBe('Passed');

      const recComp = kpis.find((k) => k.id === 'rec_completion');
      expect(recComp?.value).toBe(90);
      expect(recComp?.status).toBe('Passed');

      const overdue = kpis.find((k) => k.id === 'overdue_recs');
      expect(overdue?.value).toBe(2);
      expect(overdue?.status).toBe('Passed');

      const emerging = kpis.find((k) => k.id === 'emerging_risks_identified');
      expect(emerging?.value).toBe(6);
      expect(emerging?.status).toBe('Passed');
    });

    it('should handle zero totals gracefully', async () => {
      mockEngRepo.count.mockResolvedValue(0);
      mockReportRepo.find.mockResolvedValue([]);
      mockRecRepo.count.mockResolvedValue(0);
      mockWpRepo.count.mockResolvedValue(0);
      mockFindingRepo.count.mockResolvedValue(0);
      mockChangeRepo.count.mockResolvedValue(0);

      const kpis = await service.calculateKpis();
      expect(kpis).toHaveLength(8);

      const planComp = kpis.find((k) => k.id === 'plan_completion');
      expect(planComp?.value).toBe(0);
      expect(planComp?.status).toBe('Failed');

      const reportTime = kpis.find((k) => k.id === 'report_time');
      expect(reportTime?.current).toBe('N/A');
    });
  });

  describe('getComplianceChecklist', () => {
    it('should return IIA and TT83 checklist structure', () => {
      const checklist = service.getComplianceChecklist();
      expect(checklist).toBeDefined();
      expect(checklist.sections).toHaveLength(3);
      expect(checklist.sections[0].id).toBe('attr');
      expect(checklist.sections[1].id).toBe('perf');
      expect(checklist.sections[2].id).toBe('tt83');
    });
  });

  describe('getComplianceStatus and saveComplianceStatus', () => {
    it('should get compliance status as a map', async () => {
      mockComplianceRepo.find.mockResolvedValue([
        { id: '1000', checked: true },
        { id: '1100', checked: false },
      ]);

      const result = await service.getComplianceStatus();
      expect(result).toEqual({
        '1000': true,
        '1100': false,
      });
    });

    it('should save new compliance status when not found', async () => {
      mockComplianceRepo.findOne.mockResolvedValue(null);

      const result = await service.saveComplianceStatus('1200', true);
      expect(result).toEqual({ success: true });
      expect(mockComplianceRepo.create).toHaveBeenCalledWith({
        id: '1200',
        checked: true,
      });
      expect(mockComplianceRepo.save).toHaveBeenCalled();
    });

    it('should update existing compliance status', async () => {
      const existing = { id: '1000', checked: false };
      mockComplianceRepo.findOne.mockResolvedValue(existing);

      const result = await service.saveComplianceStatus('1000', true);
      expect(result).toEqual({ success: true });
      expect(existing.checked).toBe(true);
      expect(mockComplianceRepo.save).toHaveBeenCalledWith(existing);
    });
  });
});
