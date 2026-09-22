import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { AuditPlan } from '../audit-plans/entities/audit-plan.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import { WorkingPaper } from '../working-papers/entities/working-paper.entity';
import { RiskAssessment } from '../risk-assessments/entities/risk-assessment.entity';
import { Department } from '../departments/entities/department.entity';
import { User } from '../users/entities/user.entity';

describe('DashboardService', () => {
  let service: DashboardService;
  let planRepo: any;
  let engRepo: any;
  let findingRepo: any;
  let recRepo: any;
  let wpRepo: any;
  let raRepo: any;
  let deptRepo: any;
  let userRepo: any;

  beforeEach(async () => {
    planRepo = {
      count: jest.fn().mockResolvedValue(5),
      find: jest.fn().mockResolvedValue([]),
    };
    engRepo = {
      count: jest.fn().mockResolvedValue(12),
      find: jest.fn().mockResolvedValue([]),
    };
    findingRepo = {
      count: jest.fn().mockResolvedValue(30),
      find: jest.fn().mockResolvedValue([
        {
          id: 1,
          riskLevel: 'High',
          actualFineAmount: 5000000,
          wpTitle: 'Tín dụng',
        },
        {
          id: 2,
          riskLevel: 'Critical',
          actualFineAmount: 15000000,
          wpTitle: 'Vận hành',
        },
      ]),
    };
    recRepo = {
      count: jest.fn().mockResolvedValue(20),
      find: jest.fn().mockResolvedValue([
        { id: 1, status: 'Completed', legacyDepartment: 'Phòng Tín dụng' },
        { id: 2, status: 'InProgress', legacyDepartment: 'Phòng Kế toán' },
      ]),
    };
    wpRepo = {
      count: jest.fn().mockResolvedValue(45),
      find: jest.fn().mockResolvedValue([]),
    };
    raRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 1,
          riskLevel: 'High',
          totalScore: 80,
          legacyUniverseName: 'CN Hà Nội',
        },
        {
          id: 2,
          riskLevel: 'Low',
          totalScore: 30,
          legacyUniverseName: 'CN Hải Phòng',
        },
      ]),
    };
    deptRepo = {
      find: jest
        .fn()
        .mockResolvedValue([
          { id: 1, code: 'TD', name: 'Phòng Tín dụng', unitType: 'Branch' },
        ]),
    };
    userRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 1, role: { name: 'Admin' } }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getRepositoryToken(AuditPlan), useValue: planRepo },
        { provide: getRepositoryToken(AuditEngagement), useValue: engRepo },
        { provide: getRepositoryToken(AuditFinding), useValue: findingRepo },
        { provide: getRepositoryToken(Recommendation), useValue: recRepo },
        { provide: getRepositoryToken(WorkingPaper), useValue: wpRepo },
        { provide: getRepositoryToken(RiskAssessment), useValue: raRepo },
        { provide: getRepositoryToken(Department), useValue: deptRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStats', () => {
    it('should aggregate system-wide statistics for admin user', async () => {
      planRepo.count.mockResolvedValue(5);
      engRepo.count
        .mockResolvedValueOnce(12) // totalEngagements
        .mockResolvedValueOnce(4) // completedEngagements
        .mockResolvedValueOnce(8); // activeEngagements
      findingRepo.count
        .mockResolvedValueOnce(30) // totalFindings
        .mockResolvedValueOnce(10); // highRiskFindings
      recRepo.count
        .mockResolvedValueOnce(20) // totalRecs
        .mockResolvedValueOnce(15) // completedRecs
        .mockResolvedValueOnce(2) // overdueRecs
        .mockResolvedValueOnce(3); // inProgressRecs
      wpRepo.count
        .mockResolvedValueOnce(45) // totalWPs
        .mockResolvedValueOnce(3); // wpPendingReview

      const stats = await service.getStats({ role: 'Admin' });

      expect(stats).toBeDefined();
      expect(stats.totalPlans).toBe(5);
      expect(stats.totalEngagements).toBe(12);
      expect(stats.totalFindings).toBe(30);
      expect(stats.highRiskFindings).toBe(10);
      expect(stats.completedRecs).toBe(15);
      expect(stats.recCompletionRate).toBe(75);
      expect(stats.completedEngagements).toBe(4);
      expect(stats.activeEngagements).toBe(8);
      expect(stats.totalNd340Findings).toBe(2);
      expect(stats.totalFineAmount).toBe(20000000);
    });
  });

  describe('getRiskDistribution', () => {
    it('should return risk counts and grouped breakdown', async () => {
      raRepo.find.mockResolvedValue([
        {
          id: 1,
          riskLevel: 'High',
          totalScore: 80,
          legacyUniverseName: 'CN Hà Nội',
        },
        {
          id: 2,
          riskLevel: 'Low',
          totalScore: 30,
          legacyUniverseName: 'CN Hải Phòng',
        },
      ]);

      const dist = await service.getRiskDistribution({ role: 'Admin' });

      expect(dist).toBeDefined();
      expect(dist.riskLevelDistribution.High).toBe(1);
      expect(dist.riskLevelDistribution.Low).toBe(1);
      expect(dist.assessments.length).toBe(2);
      expect(Array.isArray(dist.findingsByCategory)).toBe(true);
    });
  });

  describe('getAuditProgress', () => {
    it('should calculate audit progress breakdown across phases', async () => {
      engRepo.find.mockResolvedValue([
        { id: 1, status: 'Planning', percentComplete: 20 },
        { id: 2, status: 'Fieldwork', percentComplete: 60 },
        { id: 3, status: 'Reporting', percentComplete: 85 },
        { id: 4, status: 'Completed', percentComplete: 100 },
      ]);

      const progress = await service.getAuditProgress({ role: 'Admin' });

      expect(progress).toBeDefined();
      expect(progress.statusCounts['Lập kế hoạch']).toBe(1);
      expect(progress.statusCounts['Đang thực hiện']).toBe(1);
      expect(progress.statusCounts['Báo cáo']).toBe(1);
      expect(progress.statusCounts['Hoàn thành']).toBe(1);
      expect(progress.total).toBe(4);
      expect(progress.chartData.length).toBe(4);
    });
  });

  describe('getRecommendationByDept', () => {
    it('should group recommendations by department', async () => {
      recRepo.find.mockResolvedValue([
        { id: 1, status: 'Completed', legacyDepartment: 'Phòng Tín dụng' },
        { id: 2, status: 'InProgress', legacyDepartment: 'Phòng Tín dụng' },
        { id: 3, status: 'Overdue', legacyDepartment: 'Phòng Kế toán' },
      ]);

      const result = await service.getRecommendationByDept({ role: 'Admin' });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      const tdDept = result.find((d: any) => d.department === 'Phòng Tín dụng');
      expect(tdDept).toBeDefined();
      expect(tdDept!.total).toBe(2);
      expect(tdDept!.completed).toBe(1);
    });
  });
});
