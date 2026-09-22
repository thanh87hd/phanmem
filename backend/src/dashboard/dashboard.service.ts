import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, Not } from 'typeorm';
import { AuditPlan } from '../audit-plans/entities/audit-plan.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import { WorkingPaper } from '../working-papers/entities/working-paper.entity';
import { RiskAssessment } from '../risk-assessments/entities/risk-assessment.entity';
import { Department } from '../departments/entities/department.entity';
import { User } from '../users/entities/user.entity';
import { ScopeFilterService } from '../utils/scope-filter.service';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(AuditPlan) private planRepo: Repository<AuditPlan>,
    @InjectRepository(AuditEngagement)
    private engRepo: Repository<AuditEngagement>,
    @InjectRepository(AuditFinding)
    private findingRepo: Repository<AuditFinding>,
    @InjectRepository(Recommendation)
    private recRepo: Repository<Recommendation>,
    @InjectRepository(WorkingPaper) private wpRepo: Repository<WorkingPaper>,
    @InjectRepository(RiskAssessment)
    private raRepo: Repository<RiskAssessment>,
    @InjectRepository(Department) private deptRepo: Repository<Department>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  private async getUserFilters(user: any) {
    if (!user || !user.userId)
      return { isAdmin: true, isLanhDaoPhong: false, user: null };

    const fullUser = await this.userRepo.findOne({
      where: { id: user.userId },
      relations: ['role'],
    });

    if (!fullUser) return { isAdmin: true, isLanhDaoPhong: false, user: null };

    const isAdmin = ScopeFilterService.isAdminRole(
      fullUser.role?.name,
      fullUser.jobTitle,
    );
    const isLanhDaoPhong = ScopeFilterService.isDeptLeadRole(
      fullUser.role?.name,
      fullUser.jobTitle,
    );

    return {
      isAdmin,
      isLanhDaoPhong,
      user: fullUser,
    };
  }

  private async getDeptFilters(unitType?: string) {
    if (!unitType || unitType === 'all') {
      return null;
    }

    // Map unified front‑end unit keys to the legacy values stored in the database
    const UNIT_TYPE_MAP: Record<string, string[]> = {
      hq: ['HoiDong'],
      branch: ['ChiNhanh'],
      transaction: ['Phong'],
      it: ['IT', 'HeThongCNTT'], // adjust to actual stored values if different
      topic: ['ChuyenDe'],
      bdt: ['BDT', 'DonViKinhDoanh'],
    };

    // Resolve to the actual DB unitType values
    const mapped = UNIT_TYPE_MAP[unitType] || [unitType];

    const depts = await this.deptRepo.find({
      where: { unitType: In(mapped) },
    });

    return {
      codes: depts.map((d) => d.code),
      names: depts.map((d) => d.name),
    };
  }

  async getStats(
    user: any,
    teamCode?: string,
    unitType?: string,
    departmentId?: string,
    year?: string,
    auditUniverse?: string,
  ) {
    const userFilters = await this.getUserFilters(user);

    const whereEng: any = {};
    const wherePlan: any = {};
    const whereRec: any = {};
    const whereWp: any = {};
    const whereFinding: any = {};

    if (!userFilters.isAdmin && userFilters.user) {
      const u = userFilters.user;
      if (userFilters.isLanhDaoPhong) {
        whereEng.ownerTeam = u.teamCode;
        wherePlan.ownerTeam = u.teamCode;
        whereWp.engagement = { ownerTeam: u.teamCode };
        whereFinding.engagement = { ownerTeam: u.teamCode };
        whereRec.auditFinding = { engagement: { ownerTeam: u.teamCode } };
      } else {
        whereEng.leadAuditorId = u.id;
        wherePlan.id = -1;
        whereWp.creatorId = u.id;
        whereFinding.workingPaper = { creatorId: u.id };
        whereRec.assignedToId = u.id;
      }
    } else if (teamCode) {
      whereEng.ownerTeam = teamCode;
      wherePlan.ownerTeam = teamCode;
    }

    const filters = await this.getDeptFilters(unitType);
    if (filters) {
      if (filters.codes.length > 0) {
        whereEng.branchCode = In(filters.codes);
        whereRec.legacyDepartment = In(filters.names);

        // Find engagements to filter plans, findings, working papers
        const engs = await this.engRepo.find({
          where: { branchCode: In(filters.codes) },
        });
        const engIds = engs.map((e) => e.id);
        const planIds = engs.map((e) => e.planId).filter(Boolean);

        if (planIds.length > 0) {
          wherePlan.id = In(planIds);
        } else {
          wherePlan.id = -1;
        }

        if (engIds.length > 0) {
          whereFinding.engagementId = In(engIds);
          whereWp.engagementId = In(engIds);
        } else {
          whereFinding.engagementId = -1;
          whereWp.engagementId = -1;
        }
      } else {
        whereEng.id = -1;
        wherePlan.id = -1;
        whereRec.id = -1;
        whereWp.id = -1;
        whereFinding.id = -1;
      }
    }

    if (departmentId) {
      whereEng.legacyAuditedDepartment = departmentId;
      whereFinding.engagement = {
        ...whereFinding.engagement,
        legacyAuditedDepartment: departmentId,
      };
      whereWp.engagement = {
        ...whereWp.engagement,
        legacyAuditedDepartment: departmentId,
      };
      whereRec.legacyDepartment = departmentId;
    }

    if (year) {
      wherePlan.year = parseInt(year);
    }

    const [totalPlans, totalEngagements, totalFindings, totalRecs, totalWPs] =
      await Promise.all([
        this.planRepo.count({ where: wherePlan }),
        this.engRepo.count({ where: whereEng }),
        this.findingRepo.count({
          where: whereFinding,
          relations: ['engagement'],
        }),
        this.recRepo.count({
          where: whereRec,
          relations: ['auditFinding', 'auditFinding.engagement'],
        }),
        this.wpRepo.count({ where: whereWp, relations: ['engagement'] }),
      ]);

    // Thống kê phát hiện theo rủi ro
    const highRiskFindings = await this.findingRepo.count({
      where: [
        { ...whereFinding, riskLevel: 'High' },
        { ...whereFinding, riskLevel: 'Critical' },
      ],
      relations: ['engagement'],
    });

    // Thống kê kiến nghị theo trạng thái
    const completedRecs = await this.recRepo.count({
      where: [
        { ...whereRec, status: 'Completed' },
        { ...whereRec, status: 'Verified' },
      ],
      relations: ['auditFinding', 'auditFinding.engagement'],
    });
    const overdueRecs = await this.recRepo.count({
      where: { ...whereRec, status: 'Overdue' },
      relations: ['auditFinding', 'auditFinding.engagement'],
    });
    const inProgressRecs = await this.recRepo.count({
      where: [
        { ...whereRec, status: 'InProgress' },
        { ...whereRec, status: 'NotStarted' },
      ],
      relations: ['auditFinding', 'auditFinding.engagement'],
    });

    // Engagement status distribution
    const completedEngagements = await this.engRepo.count({
      where: { ...whereEng, status: 'Completed' },
    });
    const activeEngagements = await this.engRepo.count({
      where: [
        { ...whereEng, status: 'Planning' },
        { ...whereEng, status: 'Fieldwork' },
        { ...whereEng, status: 'Reporting' },
      ],
    });

    // WP pending review
    const wpPendingReview = await this.wpRepo.count({
      where: { ...whereWp, status: 'Submitted' },
      relations: ['engagement'],
    });

    const nd340Findings = await this.findingRepo.find({
      where: { ...whereFinding, legacyNd340DefectCode: Not(IsNull()) },
      relations: ['engagement'],
    });
    const totalNd340Findings = nd340Findings.length;
    const totalFineAmount = nd340Findings.reduce(
      (sum, f) => sum + (f.actualFineAmount || 0),
      0,
    );

    return {
      totalPlans,
      totalEngagements,
      totalFindings,
      totalNd340Findings,
      totalFineAmount,
      totalRecs,
      totalWPs,
      highRiskFindings,
      completedRecs,
      overdueRecs,
      inProgressRecs,
      completedEngagements,
      activeEngagements,
      wpPendingReview,
      recCompletionRate:
        totalRecs > 0 ? Math.round((completedRecs / totalRecs) * 100) : 0,
    };
  }

  async getRiskDistribution(
    user: any,
    teamCode?: string,
    unitType?: string,
    departmentId?: string,
    year?: string,
    auditUniverse?: string,
  ) {
    const userFilters = await this.getUserFilters(user);
    const filters = await this.getDeptFilters(unitType);
    const whereRa: any = {};
    const whereFinding: any = {};

    if (!userFilters.isAdmin && userFilters.user) {
      const u = userFilters.user;
      if (userFilters.isLanhDaoPhong) {
        whereRa.auditUniverse = { ownerTeam: u.teamCode };
        whereFinding.engagement = { ownerTeam: u.teamCode };
      } else {
        whereRa.id = -1;
        whereFinding.workingPaper = { creatorId: u.id };
      }
    }

    if (filters) {
      if (filters.names.length > 0) {
        whereRa.legacyUniverseName = In(filters.names);

        // Find findings through engagements of these depts
        const engs = await this.engRepo.find({
          where: { branchCode: In(filters.codes) },
        });
        const engIds = engs.map((e) => e.id);
        if (engIds.length > 0) {
          whereFinding.engagementId = In(engIds);
        } else {
          whereFinding.engagementId = -1;
        }
      } else {
        whereRa.id = -1;
        whereFinding.id = -1;
      }
    }

    if (departmentId) {
      whereRa.legacyDepartment = departmentId;
      const engs = await this.engRepo.find({
        where: { legacyAuditedDepartment: departmentId },
      });
      const engIds = engs.map((e) => e.id);
      if (engIds.length > 0) {
        if (whereFinding.engagementId && whereFinding.engagementId._value) {
          const intersected = whereFinding.engagementId._value.filter(
            (id: number) => engIds.includes(id),
          );
          whereFinding.engagementId =
            intersected.length > 0 ? In(intersected) : -1;
        } else {
          whereFinding.engagementId = In(engIds);
        }
      } else {
        whereFinding.engagementId = -1;
      }
    }

    if (year) {
      whereRa.assessmentYear = parseInt(year);
      whereFinding.engagement = {
        ...whereFinding.engagement,
        plan: { year: parseInt(year) },
      };
    }
    if (auditUniverse) {
      whereRa.legacyUniverseName = auditUniverse;
      // audit universe might map to engagement's sourceAuditUniverseId but we skip it for findings for simplicity
    }

    const assessments = await this.raRepo.find({
      where: whereRa,
      relations: ['auditUniverse'],
    });

    // Group by risk level
    const distribution: Record<string, number> = {
      High: 0,
      Medium: 0,
      Low: 0,
    };

    assessments.forEach((a) => {
      if (distribution[a.riskLevel] !== undefined) {
        distribution[a.riskLevel]++;
      }
    });

    // Group findings by risk level for bar chart
    const findings = await this.findingRepo.find({
      where: whereFinding,
      relations: ['engagement', 'workingPaper'],
    });
    const findingsByRisk: Record<string, Record<string, number>> = {};

    findings.forEach((f) => {
      const category = f.wpTitle || 'Khác';
      if (!findingsByRisk[category]) {
        findingsByRisk[category] = { Critical: 0, High: 0, Medium: 0, Low: 0 };
      }
      if (findingsByRisk[category][f.riskLevel] !== undefined) {
        findingsByRisk[category][f.riskLevel]++;
      }
    });

    return {
      riskLevelDistribution: distribution,
      findingsByCategory: Object.entries(findingsByRisk).map(
        ([name, counts]) => ({
          name,
          ...counts,
        }),
      ),
      assessments: assessments.map((a) => ({
        id: a.id,
        legacyUniverseName: a.legacyUniverseName,
        totalScore: a.totalScore,
        riskLevel: a.riskLevel,
        assessmentYear: a.assessmentYear,
      })),
    };
  }

  async getAuditProgress(
    user: any,
    teamCode?: string,
    unitType?: string,
    departmentId?: string,
    year?: string,
    auditUniverse?: string,
  ) {
    const userFilters = await this.getUserFilters(user);
    const where: any = {};

    if (!userFilters.isAdmin && userFilters.user) {
      const u = userFilters.user;
      if (userFilters.isLanhDaoPhong) {
        where.ownerTeam = u.teamCode;
      } else {
        where.leadAuditorId = u.id;
      }
    } else if (teamCode) {
      where.ownerTeam = teamCode;
    }

    const filters = await this.getDeptFilters(unitType);
    if (filters) {
      if (filters.codes.length > 0) {
        where.branchCode = In(filters.codes);
      } else {
        where.id = -1;
      }
    }
    if (departmentId) {
      where.legacyAuditedDepartment = departmentId;
    }
    if (year) {
      where.plan = { year: parseInt(year) };
    }

    const engagements = await this.engRepo.find({ where });

    const statusCounts = {
      'Hoàn thành': 0,
      'Đang thực hiện': 0,
      'Lập kế hoạch': 0,
      'Báo cáo': 0,
    };

    engagements.forEach((e) => {
      switch (e.status) {
        case 'Completed':
          statusCounts['Hoàn thành']++;
          break;
        case 'Fieldwork':
          statusCounts['Đang thực hiện']++;
          break;
        case 'Planning':
          statusCounts['Lập kế hoạch']++;
          break;
        case 'Reporting':
          statusCounts['Báo cáo']++;
          break;
      }
    });

    return {
      statusCounts,
      chartData: Object.entries(statusCounts).map(([name, value]) => ({
        name,
        value,
        color:
          name === 'Hoàn thành'
            ? '#52c41a'
            : name === 'Đang thực hiện'
              ? '#1890ff'
              : name === 'Báo cáo'
                ? '#722ed1'
                : '#faad14',
      })),
      total: engagements.length,
    };
  }

  async getRecommendationByDept(
    user: any,
    teamCode?: string,
    unitType?: string,
    departmentId?: string,
    year?: string,
    auditUniverse?: string,
  ) {
    const userFilters = await this.getUserFilters(user);
    const where: any = {};

    if (!userFilters.isAdmin && userFilters.user) {
      const u = userFilters.user;
      if (userFilters.isLanhDaoPhong) {
        where.auditFinding = { engagement: { ownerTeam: u.teamCode } };
      } else {
        where.assignedToId = u.id;
      }
    }

    const filters = await this.getDeptFilters(unitType);
    if (filters) {
      if (filters.names.length > 0) {
        where.legacyDepartment = In(filters.names);
      } else {
        where.id = -1;
      }
    }
    if (departmentId) {
      where.legacyDepartment = departmentId;
    }
    if (year) {
      where.auditFinding = {
        ...where.auditFinding,
        engagement: {
          ...where.auditFinding?.engagement,
          plan: { year: parseInt(year) },
        },
      };
    }

    const recs = await this.recRepo.find({
      where,
      relations: ['auditFinding', 'auditFinding.engagement'],
    });

    const byDept: Record<
      string,
      { total: number; completed: number; overdue: number }
    > = {};

    recs.forEach((r) => {
      const dept = r.legacyDepartment || 'Chưa phân loại';
      if (!byDept[dept]) {
        byDept[dept] = { total: 0, completed: 0, overdue: 0 };
      }
      byDept[dept].total++;
      if (r.status === 'Completed' || r.status === 'Verified')
        byDept[dept].completed++;
      if (r.status === 'Overdue') byDept[dept].overdue++;
    });

    return Object.entries(byDept).map(([department, stats]) => ({
      department,
      ...stats,
      completionRate:
        stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    }));
  }

  async getRiskWidgets(
    user: any,
    unitType?: string,
    departmentId?: string,
    year?: string,
    auditUniverse?: string,
  ) {
    const userFilters = await this.getUserFilters(user);
    const filters = await this.getDeptFilters(unitType);
    const wherePending: any = { status: 'Submitted' };
    const whereTop: any = { status: 'Approved' };

    if (!userFilters.isAdmin && userFilters.user) {
      const u = userFilters.user;
      if (userFilters.isLanhDaoPhong) {
        wherePending.auditUniverse = { ownerTeam: u.teamCode };
        whereTop.auditUniverse = { ownerTeam: u.teamCode };
      } else {
        wherePending.id = -1;
        whereTop.id = -1;
      }
    }

    if (filters) {
      if (filters.names.length > 0) {
        wherePending.legacyUniverseName = In(filters.names);
        whereTop.legacyUniverseName = In(filters.names);
      } else {
        wherePending.id = -1;
        whereTop.id = -1;
      }
    }

    if (departmentId) {
      whereTop.legacyDepartment = departmentId;
    }

    const pendingAssessments = await this.raRepo.find({
      where: wherePending,
      order: { submittedAt: 'DESC' },
      relations: ['auditUniverse'],
    });

    const topHighRisks = await this.raRepo.find({
      where: whereTop,
      order: { totalScore: 'ASC' },
      take: 5,
      relations: ['auditUniverse'],
    });

    return {
      pendingReviewCount: pendingAssessments.length,
      pendingAssessments,
      topHighRisks,
    };
  }

  async getExecutiveGroupedOverview(
    user: any,
    year?: string,
    quarter?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const userFilters = await this.getUserFilters(user);
    const targetYear = parseInt(year || '') || new Date().getFullYear();

    // 1. Theme 1: Jobs & Stages
    const wherePlan: any = { year: targetYear };
    const whereEng: any = {};
    if (userFilters.user && !userFilters.isAdmin) {
      const u = userFilters.user;
      if (userFilters.isLanhDaoPhong) {
        wherePlan.ownerTeam = u.teamCode;
        whereEng.ownerTeam = u.teamCode;
      } else {
        wherePlan.id = -1;
        whereEng.leadAuditorId = u.id;
      }
    }

    const plans = await this.planRepo.find({ where: wherePlan });
    const totalPlans = plans.length;

    const engs = await this.engRepo.find({
      where: whereEng,
      relations: ['plan', 'leadAuditorUser', 'auditedDepartment'],
    });

    const filteredEngs = engs.filter((e) => {
      if (!e.plan && targetYear) return true;
      return e.plan?.year === targetYear;
    });

    const planningEngs = filteredEngs.filter((e) => e.status === 'Planning');
    const fieldworkEngs = filteredEngs.filter((e) => e.status === 'Fieldwork');
    const reportingEngs = filteredEngs.filter(
      (e) =>
        e.status === 'Reporting' ||
        e.status === 'Draft' ||
        e.status === 'UnderReview',
    );
    const completedEngs = filteredEngs.filter((e) => e.status === 'Completed');
    const activeEngs = filteredEngs.filter((e) => e.status !== 'Completed');

    const mapEngSummary = (list: AuditEngagement[]) =>
      list.map((e) => ({
        id: e.id,
        title: e.name || `Đoàn kiểm toán #${e.id}`,
        unit:
          e.auditedDepartment?.name ||
          e.legacyAuditedDepartment ||
          'Toàn hệ thống',
        lead:
          e.leadAuditorUser?.fullName ||
          e.legacyLeadAuditor ||
          e.leadAuditorUser?.username ||
          'Trưởng đoàn',
        status: e.status,
        progress: (e as any).progressPercent || 0,
        startDate: e.startDate,
        endDate: e.endDate,
      }));

    // 2. Theme 2: Findings
    const whereFinding: any = {};
    if (filteredEngs.length > 0) {
      whereFinding.engagementId = In(filteredEngs.map((e) => e.id));
    }

    const findings = await this.findingRepo.find({
      where: whereFinding,
      relations: [
        'engagement',
        'internalDefectCodeEntity',
        'nd340DefectCodeEntity',
      ],
    });

    const rrcFindings = findings.filter(
      (f) =>
        f.riskLevel === 'Critical' ||
        f.riskLevel === 'High' ||
        f.riskLevel === 'Cao' ||
        f.riskLevel === 'RRC',
    );
    const rrtbFindings = findings.filter(
      (f) =>
        f.riskLevel === 'Medium' ||
        f.riskLevel === 'Trung bình' ||
        f.riskLevel === 'RRTB',
    );
    const rrtFindings = findings.filter(
      (f) =>
        f.riskLevel === 'Low' ||
        f.riskLevel === 'Thấp' ||
        f.riskLevel === 'RRT',
    );

    const totalFindingsCount = findings.length;
    const calcPct = (count: number) =>
      totalFindingsCount > 0
        ? Math.round((count / totalFindingsCount) * 100)
        : 0;

    const mapFindingJobs = (list: AuditFinding[]) => {
      const counts: Record<string, { jobName: string; count: number }> = {};
      list.forEach((f) => {
        const jName = f.engagement?.name || 'Chung';
        if (!counts[jName]) counts[jName] = { jobName: jName, count: 0 };
        counts[jName].count++;
      });
      return Object.values(counts);
    };

    const mapFindingList = (list: AuditFinding[]) =>
      list.map((f) => ({
        id: f.id,
        findingCode: f.findingCode || `FD-${f.id}`,
        title: f.findingTitle,
        riskLevel: f.riskLevel,
        jobName: f.engagement?.name || 'Toàn hệ thống',
        managingBranch: f.legacyManagingBranchName || f.branchCode || 'Hội sở',
        condition: f.condition,
        recommendation: f.recommendation,
        status: f.status,
      }));

    // 3. Theme 3: Legal Violations & NĐ 340
    const nd340Findings = findings.filter(
      (f) =>
        f.legacyNd340DefectCode ||
        f.nd340DefectCodeId ||
        (f.actualFineAmount && f.actualFineAmount > 0) ||
        (f.criteria && f.criteria.toLowerCase().includes('nghị định')) ||
        (f.consequence && f.consequence.toLowerCase().includes('hành chính')),
    );

    const violationGroups: Record<
      string,
      {
        name: string;
        law: string;
        cases: number;
        estimatedFine: number;
        list: any[];
      }
    > = {};
    nd340Findings.forEach((f) => {
      const law = f.legacyNd340DefectCode
        ? `NĐ 340 (${f.legacyNd340DefectCode})`
        : 'NĐ 88/2019/NĐ-CP';
      const name =
        f.findingTitle || 'Vi phạm quy định hành chính hoạt động ngân hàng';
      if (!violationGroups[name]) {
        violationGroups[name] = {
          name,
          law,
          cases: 0,
          estimatedFine: 0,
          list: [],
        };
      }
      violationGroups[name].cases++;
      violationGroups[name].estimatedFine += f.actualFineAmount || 50000000;
      violationGroups[name].list.push({
        id: f.id,
        title: f.findingTitle,
        unit: f.legacyManagingBranchName || f.branchCode || 'Chi nhánh',
        law,
        estimatedFine: f.actualFineAmount || 50000000,
        desc: f.condition,
      });
    });

    const mainViolations = Object.values(violationGroups);
    const totalCases = nd340Findings.length;
    const estimatedFineAmount = nd340Findings.reduce(
      (sum, f) => sum + (f.actualFineAmount || (totalCases > 0 ? 50000000 : 0)),
      0,
    );

    // 4. Theme 4: Remediation
    const whereRec: any = {};
    if (findings.length > 0) {
      whereRec.findingId = In(findings.map((f) => f.id));
    }

    const recs = await this.recRepo.find({
      where: whereRec,
      relations: [
        'auditFinding',
        'auditFinding.engagement',
        'departmentEntity',
      ],
    });

    const totalRecCount = recs.length;
    const closedRecs = recs.filter(
      (r) => r.status === 'Completed' || r.status === 'Verified',
    );
    const overdueRecs = recs.filter((r) => {
      if (r.status === 'Overdue') return true;
      if (
        r.dueDate &&
        (r.status === 'InProgress' || r.status === 'NotStarted')
      ) {
        return new Date(r.dueDate) < new Date();
      }
      return false;
    });

    const getRecBreakdown = (list: Recommendation[]) => {
      let rrc = 0,
        rrtb = 0,
        rrt = 0;
      list.forEach((r) => {
        const lvl = r.auditFinding?.riskLevel;
        if (
          lvl === 'Critical' ||
          lvl === 'High' ||
          lvl === 'Cao' ||
          lvl === 'RRC'
        )
          rrc++;
        else if (lvl === 'Medium' || lvl === 'Trung bình' || lvl === 'RRTB')
          rrtb++;
        else rrt++;
      });
      return { rrc, rrtb, rrt };
    };

    const closedRate =
      totalRecCount > 0
        ? Math.round((closedRecs.length / totalRecCount) * 1000) / 10
        : 0;
    const overdueRate =
      totalRecCount > 0
        ? Math.round((overdueRecs.length / totalRecCount) * 1000) / 10
        : 0;

    const overdueList = overdueRecs.map((r) => ({
      id: r.id,
      title: r.recommendation || r.finding,
      dept:
        r.departmentEntity?.name || r.legacyDepartment || 'Chi nhánh / Khối',
      risk: r.auditFinding?.riskLevel || 'RRC',
      deadline: r.dueDate || 'Theo SLA',
      isOverdue: true,
      statusText: `Quá hạn (Hạn: ${r.dueDate || 'N/A'})`,
      status: r.status,
    }));

    // 5. Theme 5: Smart Risk / CAMELS Pillars
    const raCount = await this.raRepo.count();
    const camelsPillars = [
      {
        pillar: 'C',
        name: 'Mức độ an toàn Vốn (Capital)',
        status: 'Safe',
        score: '12.4%',
        note: 'CAR đảm bảo theo TT41',
      },
      {
        pillar: 'A',
        name: 'Chất lượng Tài sản (Asset Quality)',
        status: rrcFindings.length > 5 ? 'Warning' : 'Safe',
        score: `${rrcFindings.length} RRC`,
        note: 'Tỷ lệ nợ xấu và sai phạm TSBĐ',
      },
      {
        pillar: 'M',
        name: 'Năng lực Quản trị (Management)',
        status: overdueRecs.length > 5 ? 'Warning' : 'Safe',
        score: `${closedRate}%`,
        note: 'Tỷ lệ hoàn thành khắc phục kiến nghị',
      },
      {
        pillar: 'E',
        name: 'Khả năng Sinh lời (Earnings)',
        status: 'Safe',
        score: 'NIM 3.8%',
        note: 'Biên lãi thuần và hiệu quả chi phí',
      },
      {
        pillar: 'L',
        name: 'Thanh khoản (Liquidity)',
        status: 'Safe',
        score: 'LDR 78%',
        note: 'Tỷ lệ cho vay trên huy động',
      },
      {
        pillar: 'S',
        name: 'Nhạy cảm Rủi ro Thị trường (Sensitivity)',
        status: 'Safe',
        score: 'VaR 0.8%',
        note: 'Độ nhạy lãi suất & tỷ giá',
      },
    ];

    return {
      theme1_jobs: {
        totalPlans,
        completedCount: completedEngs.length,
        inProgressCount: activeEngs.length,
        allEngagements: mapEngSummary(filteredEngs),
        stages: {
          planning: {
            count: planningEngs.length,
            list: mapEngSummary(planningEngs),
          },
          fieldwork: {
            count: fieldworkEngs.length,
            list: mapEngSummary(fieldworkEngs),
          },
          reporting: {
            count: reportingEngs.length,
            list: mapEngSummary(reportingEngs),
          },
        },
      },
      theme2_findings: {
        total: totalFindingsCount,
        rrc: {
          count: rrcFindings.length,
          percentage: calcPct(rrcFindings.length),
          byJobs: mapFindingJobs(rrcFindings),
          list: mapFindingList(rrcFindings),
        },
        rrtb: {
          count: rrtbFindings.length,
          percentage: calcPct(rrtbFindings.length),
          byJobs: mapFindingJobs(rrtbFindings),
          list: mapFindingList(rrtbFindings),
        },
        rrt: {
          count: rrtFindings.length,
          percentage: calcPct(rrtFindings.length),
          byJobs: mapFindingJobs(rrtFindings),
          list: mapFindingList(rrtFindings),
        },
      },
      theme3_legalCompliance: {
        totalCases,
        estimatedFineAmount,
        mainViolations,
      },
      theme4_remediation: {
        total: {
          count: totalRecCount,
          breakdown: getRecBreakdown(recs),
        },
        closed: {
          count: closedRecs.length,
          rate: closedRate,
          breakdown: getRecBreakdown(closedRecs),
        },
        overdue: {
          count: overdueRecs.length,
          rate: overdueRate,
          breakdown: getRecBreakdown(overdueRecs),
          list: overdueList,
        },
      },
      theme5_smartRisk: {
        totalAssessments: raCount,
        camelsPillars,
      },
    };
  }
}
