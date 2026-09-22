import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../departments/entities/department.entity';
import { AuditUniverse } from '../audit-universe/entities/audit-universe.entity';
import { AuditPlan } from '../audit-plans/entities/audit-plan.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import { MonitoringAlert } from '../continuous-monitoring/entities/monitoring-alert.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { UserCompetency } from '../users/entities/user-competency.entity';
import { RiskCriterion } from '../risk-criteria/entities/risk-criterion.entity';
import { RiskAssessment } from '../risk-assessments/entities/risk-assessment.entity';
import { WorkingPaper } from '../working-papers/entities/working-paper.entity';
import {
  AuditSample,
  TestResult,
} from '../audit-findings/entities/audit-sample.entity';
import {
  AuditSampleBatch,
  SampleType,
  SamplingMethod,
} from '../audit-findings/entities/audit-sample-batch.entity';
import { AuditReport } from '../audit-reports/entities/audit-report.entity';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { LPBANK_ORG_SEED } from './lpbank-org-seed';

function loadSeederFile<T>(filename: string): T {
  const candidatePaths = [
    path.join(__dirname, filename),
    path.join(__dirname, 'fixtures', filename),
    path.join(process.cwd(), 'src', 'seeder', filename),
    path.join(process.cwd(), 'src', 'seeder', 'fixtures', filename),
    path.join(process.cwd(), 'dist', 'seeder', filename),
    path.join(process.cwd(), 'dist', 'seeder', 'fixtures', filename),
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  }
  throw new Error(`Seeder data file not found: ${filename}`);
}

const parsedDepartments = loadSeederFile<any>('parsed_departments.json');
const proposedProcesses = loadSeederFile<any>(
  'proposed_audit_universe_processes.json',
);

export function normalizeUnitType(name: string, currentType?: string): string {
  const normalized = name.toLowerCase().trim();

  if (normalized.includes('hội đồng')) {
    return 'HoiDong';
  }

  // Rule for UyBan / Ban:
  // Must contain "ủy ban" or "ban" as a standalone word (excluding "phòng ban", "vùng ban")
  const hasBanWord =
    /\bban\b/i.test(normalized) || normalized.includes('ủy ban');
  const isExcluded =
    normalized.includes('phòng ban') || normalized.includes('vùng ban');

  if (hasBanWord && !isExcluded) {
    return 'UyBan';
  }

  if (normalized.includes('khối')) {
    return 'Khoi';
  }

  if (
    normalized.includes('chi nhánh') ||
    normalized.includes('cụm chi nhánh')
  ) {
    return 'ChiNhanh';
  }

  if (normalized.includes('phòng giao dịch') || normalized.includes('pgd')) {
    return 'PGD';
  }

  if (normalized.includes('trung tâm')) {
    return 'TrungTam';
  }

  if (normalized.includes('ban đại diện') || normalized.includes('bđt')) {
    return 'BDT';
  }

  if (
    normalized.includes('phòng') ||
    normalized.includes('bộ phận') ||
    normalized.includes('tổ ')
  ) {
    return 'Phong';
  }

  if (currentType === 'DonViKinhDoanh') {
    return 'BDT';
  }

  return currentType || 'Phong';
}

@Injectable()
export class SeederService {
  constructor(
    @InjectRepository(Department) private deptRepo: Repository<Department>,
    @InjectRepository(AuditUniverse)
    private universeRepo: Repository<AuditUniverse>,
    @InjectRepository(AuditPlan) private planRepo: Repository<AuditPlan>,
    @InjectRepository(AuditEngagement)
    private engagementRepo: Repository<AuditEngagement>,
    @InjectRepository(AuditFinding)
    private findingRepo: Repository<AuditFinding>,
    @InjectRepository(Recommendation)
    private recRepo: Repository<Recommendation>,
    @InjectRepository(MonitoringAlert)
    private alertRepo: Repository<MonitoringAlert>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(UserCompetency)
    private competencyRepo: Repository<UserCompetency>,
    @InjectRepository(RiskCriterion)
    private riskCriterionRepo: Repository<RiskCriterion>,
    @InjectRepository(RiskAssessment)
    private riskAssessmentRepo: Repository<RiskAssessment>,
    @InjectRepository(WorkingPaper)
    private workingPaperRepo: Repository<WorkingPaper>,
    @InjectRepository(AuditSample)
    private auditSampleRepo: Repository<AuditSample>,
    @InjectRepository(AuditSampleBatch)
    private auditSampleBatchRepo: Repository<AuditSampleBatch>,
    @InjectRepository(AuditReport)
    private auditReportRepo: Repository<AuditReport>,
  ) {}

  async seedSecurityData() {
    // 1. Clear existing data to avoid FK conflicts
    await this.clearAll();
    await this.seedRiskCriteria();
    await this.userRepo.query('TRUNCATE TABLE users CASCADE');
    await this.roleRepo.query('TRUNCATE TABLE roles CASCADE');

    const passwordHash = await bcrypt.hash('@bcd1234', 12);

    // 2. Create Roles with permissions from fixture
    const rolesData = loadSeederFile<Partial<Role>[]>('roles.json');
    const savedRoles: Record<string, Role> = {};
    for (const r of rolesData) {
      const role = this.roleRepo.create(r);
      savedRoles[r.name as string] = await this.roleRepo.save(role);
    }

    // 3. Create Users from fixture
    const usersData = loadSeederFile<any[]>('users.json');
    for (const u of usersData) {
      const { roleName, ...userData } = u;
      const role = savedRoles[roleName] || savedRoles['Kiểm toán viên'];
      const user = this.userRepo.create({
        ...userData,
        role,
        passwordHash,
        isActive: true,
      });
      await this.userRepo.save(user);
    }

    // Seed Competencies for internal auditors
    try {
      await this.competencyRepo.query(
        'TRUNCATE TABLE user_competencies CASCADE',
      );
    } catch (e) {
      // Table might not exist or be truncated yet
    }

    const createdUsers = await this.userRepo.find();
    for (const user of createdUsers) {
      if (user.username === 'binhtt12') {
        await this.competencyRepo.save(
          this.competencyRepo.create({
            userId: user.id,
            skillName: 'Quản trị rủi ro',
            skillCategory: 'Core',
            rating: 5,
            notes: 'Chứng chỉ CIA, FRM',
          }),
        );
        await this.competencyRepo.save(
          this.competencyRepo.create({
            userId: user.id,
            skillName: 'Tín dụng',
            skillCategory: 'Specialized',
            rating: 5,
            notes: '10 năm kinh nghiệm thẩm định',
          }),
        );
        await this.competencyRepo.save(
          this.competencyRepo.create({
            userId: user.id,
            skillName: 'Công nghệ thông tin',
            skillCategory: 'Specialized',
            rating: 4,
          }),
        );
      } else if (user.username === 'hoangnk1') {
        await this.competencyRepo.save(
          this.competencyRepo.create({
            userId: user.id,
            skillName: 'Công nghệ thông tin',
            skillCategory: 'Specialized',
            rating: 5,
            notes: 'Chứng chỉ CISA, CISSP',
          }),
        );
        await this.competencyRepo.save(
          this.competencyRepo.create({
            userId: user.id,
            skillName: 'Bảo mật hệ thống',
            skillCategory: 'Specialized',
            rating: 5,
          }),
        );
      } else if (user.username === 'chaunm3') {
        await this.competencyRepo.save(
          this.competencyRepo.create({
            userId: user.id,
            skillName: 'Tín dụng',
            skillCategory: 'Core',
            rating: 4,
            notes: 'Kiểm toán tín dụng chi nhánh',
          }),
        );
        await this.competencyRepo.save(
          this.competencyRepo.create({
            userId: user.id,
            skillName: 'Vận hành thẻ',
            skillCategory: 'Specialized',
            rating: 5,
          }),
        );
      } else if (user.username === 'anhttn2') {
        await this.competencyRepo.save(
          this.competencyRepo.create({
            userId: user.id,
            skillName: 'Kế toán & Kho quỹ',
            skillCategory: 'Specialized',
            rating: 5,
            notes: 'Chứng chỉ ACCA',
          }),
        );
        await this.competencyRepo.save(
          this.competencyRepo.create({
            userId: user.id,
            skillName: 'Huy động vốn',
            skillCategory: 'Core',
            rating: 4,
          }),
        );
      }
    }

    return { roles: Object.keys(savedRoles).length, users: usersData.length };
  }

  async seedLargeData() {
    await this.clearAll();
    await this.seedRiskCriteria();
    const results = {
      departments: 0,
      universe: 0,
      riskAssessments: 0,
      plans: 0,
      engagements: 0,
      workingPapers: 0,
      sampleBatches: 0,
      samples: 0,
      findings: 0,
      recommendations: 0,
      alerts: 0,
      reports: 0,
    };

    // 1. Seed all Departments (with unitType from parsed_departments)
    const savedDepartments: Department[] = [];
    for (const dept of parsedDepartments) {
      const normalizedType = normalizeUnitType(
        dept.name,
        dept.unitType || 'Phong',
      );
      const b = this.deptRepo.create({
        name: dept.name,
        code: dept.code,
        parent: dept.parent || undefined,
        description: dept.description || '',
        status: dept.status || 'Active',
        unitType: normalizedType,
      });
      const savedB = await this.deptRepo.save(b);
      savedDepartments.push(savedB);
      results.departments++;
    }

    // Filter HO departments and DVKD business units
    const dvkdDepts = savedDepartments.filter((d) => d.parent === 'DVKD');

    // 2. Seed Audit Universe (Total 190 items)
    const universeItems: AuditUniverse[] = [];

    // 2.1 Seed 10 General Processes (Nghiệp vụ chung cấp hệ thống)
    const generalProcesses = [
      'Huy động vốn',
      'Tín dụng cá nhân',
      'Tín dụng doanh nghiệp',
      'Kế toán & Kho quỹ',
      'Bảo mật & An ninh thông tin',
      'eKYC & Ngân hàng số',
      'Tín dụng tiểu thương',
      'Phòng chống rửa tiền (AML)',
      'Quản trị thanh khoản và nguồn vốn',
      'Vận hành thẻ',
    ];

    for (const proc of generalProcesses) {
      const fin = Math.round((Math.random() * 5 + 4.5) * 10) / 10; // 4.5 - 9.5
      const oper = Math.round((Math.random() * 5 + 4.5) * 10) / 10;
      const past = Math.round((Math.random() * 5 + 4.5) * 10) / 10;
      const score = Math.round((0.4 * past + 0.3 * fin + 0.3 * oper) * 10) / 10;
      const rating = score >= 7.5 ? 'High' : score >= 5.0 ? 'Medium' : 'Low';

      const u = this.universeRepo.create({
        name: proc,
        description: `Quy trình nghiệp vụ hệ thống: ${proc}`,
        department: 'Toàn hệ thống (Khối HO phối hợp)',
        auditCategory: 'ChuyenDe',
        ownerTeam: 'TongHop',
        financialSize: fin,
        operationalRiskScore: oper,
        pastFindingsScore: past,
        riskScore: score,
        dynamicRiskRating: rating,
        nextAuditYear: score >= 7.5 ? 2026 : score >= 5.0 ? 2027 : 2028,
        status: 'Active',
      });
      const savedU = await this.universeRepo.save(u);
      universeItems.push(savedU);
      results.universe++;
    }

    // 2.2 Seed HO Detailed Processes (From CNNV.xlsx)
    for (const proc of proposedProcesses) {
      const fin = Math.round((Math.random() * 5 + 4.0) * 10) / 10; // 4.0 - 9.0
      const oper = Math.round((Math.random() * 5 + 4.0) * 10) / 10;
      const past = Math.round((Math.random() * 5 + 4.0) * 10) / 10;
      const score = Math.round((0.4 * past + 0.3 * fin + 0.3 * oper) * 10) / 10;
      const rating = score >= 7.5 ? 'High' : score >= 5.0 ? 'Medium' : 'Low';

      const u = this.universeRepo.create({
        name: proc.legacyProcessName,
        description: proc.description,
        department: proc.department,
        auditCategory: proc.category || 'HoiSo',
        ownerTeam: 'PKT_HoiSo',
        financialSize: fin,
        operationalRiskScore: oper,
        pastFindingsScore: past,
        riskScore: score,
        dynamicRiskRating: rating,
        nextAuditYear: score >= 7.5 ? 2026 : score >= 5.0 ? 2027 : 2028,
        status: 'Active',
      });
      const savedU = await this.universeRepo.save(u);
      universeItems.push(savedU);
      results.universe++;
    }

    // 2.3 Seed 104 Business Units (DVKD)
    for (const dept of dvkdDepts) {
      const fin = Math.round((Math.random() * 5 + 3.5) * 10) / 10; // 3.5 - 8.5
      const oper = Math.round((Math.random() * 5 + 3.5) * 10) / 10;
      const past = Math.round((Math.random() * 5 + 3.5) * 10) / 10;
      const score = Math.round((0.4 * past + 0.3 * fin + 0.3 * oper) * 10) / 10;
      const rating = score >= 7.5 ? 'High' : score >= 5.0 ? 'Medium' : 'Low';

      const u = this.universeRepo.create({
        name: dept.name,
        description: `Đối tượng kiểm toán độc lập ĐVKD: ${dept.name}`,
        department: dept.name,
        auditCategory: 'ChiNhanh',
        ownerTeam: 'PKT_DVKD',
        financialSize: fin,
        operationalRiskScore: oper,
        pastFindingsScore: past,
        riskScore: score,
        dynamicRiskRating: rating,
        nextAuditYear: score >= 7.5 ? 2026 : score >= 5.0 ? 2027 : 2028,
        status: 'Active',
      });
      const savedU = await this.universeRepo.save(u);
      universeItems.push(savedU);
      results.universe++;
    }

    // Fetch users for linking
    const users = await this.userRepo.find();
    const userMap = new Map<string, User>();
    for (const u of users) {
      userMap.set(u.username, u);
    }

    const auditor1 = userMap.get('thanhpd') || users[0];
    const auditor2 = userMap.get('luongnt2') || users[1];
    const auditor3 = userMap.get('hoangnk1') || users[2];
    const auditor4 = userMap.get('chaunm3') || users[3];
    const auditor5 = userMap.get('anhttn2') || users[4];
    const caeUser = userMap.get('binhtt12') || users[0];

    // 3. Seed Risk Assessments (for all universe items)
    const riskCriteria = await this.riskCriterionRepo.find();
    for (const item of universeItems) {
      const criteriaForCategory = riskCriteria.filter(
        (c) => c.auditCategory === item.auditCategory,
      );
      const criteriaList =
        criteriaForCategory.length > 0
          ? criteriaForCategory
          : riskCriteria.slice(0, 3);
      const criteriaScores = criteriaList.map((c) => {
        const score = Math.floor(Math.random() * 3) + 3; // 3 to 5
        return {
          criteriaId: c.id,
          criteriaName: c.name,
          weight: c.weight,
          score: score,
          weightedScore: Math.round(((c.weight * score) / 100) * 100) / 100,
        };
      });

      const totalScore = criteriaScores.reduce(
        (sum, current) => sum + current.weightedScore,
        0,
      );
      const isHigh = totalScore >= 4.0;
      const riskLevel = isHigh ? 'High' : totalScore >= 2.5 ? 'Medium' : 'Low';

      const ra = this.riskAssessmentRepo.create({
        legacyUniverseName: item.name,
        auditUniverseId: item.id,
        legacyDepartmentName: item.department,
        auditCategory: item.auditCategory,

        totalScore: Math.round(totalScore * 10) / 10,
        criteriaScores: criteriaScores,
        impact: Math.floor(Math.random() * 3) + 3,
        likelihood: Math.floor(Math.random() * 3) + 3,
        inherentRiskScore: Math.round(totalScore * 10) / 10,
        controlEffectiveness: totalScore >= 4.0 ? 'Weak' : 'Adequate',
        residualRiskScore:
          Math.round(totalScore * (totalScore >= 4.0 ? 1.2 : 0.8) * 10) / 10,
        riskVelocity: 'Stable',
        riskAppetite: 'Mitigate',
        auditFrequency: 'Annual',
        lastAuditDate: '2025-06-15',
        riskLevel: riskLevel,
        assessmentYear: 2026,
        status: 'Approved',
        assessedById: auditor1.id,
        legacyAssessedByUserId: auditor1.id,
        legacyAssessedByName: auditor1.fullName,
        reviewedById: caeUser.id,
        legacyReviewedByUserId: caeUser.id,
        legacyReviewedByName: caeUser.fullName,
        submittedAt: new Date('2026-01-10T08:00:00Z'),
        reviewedAt: new Date('2026-01-15T09:30:00Z'),
        notes: `Đánh giá rủi ro định kỳ cho ${item.name} năm 2026`,
        riskDescription: `Rủi ro phát sinh trong hoạt động liên quan đến quy trình ${item.name}`,
      });
      await this.riskAssessmentRepo.save(ra);
      results.riskAssessments++;
    }

    // 4. Audit Plans
    const plans: AuditPlan[] = [];
    for (let year = 2024; year <= 2025; year++) {
      const p = this.planRepo.create({
        name: `Kế hoạch kiểm toán năm ${year}`,
        year: year,
        status: 'Approved',
        ownerTeam: 'ToanKhoi',
        approvedBy: caeUser.id,
        approvedAt: new Date(`${year}-01-05T09:00:00Z`),
        approvalNotes: `Phê duyệt kế hoạch kiểm toán năm ${year}`,
      });
      const savedP = await this.planRepo.save(p);
      plans.push(savedP);
      results.plans++;
    }

    // Plan 2026
    const highRiskUniverse = universeItems
      .filter((u) => u.dynamicRiskRating === 'High')
      .slice(0, 10);
    const selectedUnits = highRiskUniverse.map((u) => ({
      universeId: u.id,
      name: u.name,
      riskLevel: u.dynamicRiskRating,
      justification: `Đơn vị/Quy trình có điểm rủi ro cao (${u.riskScore}), cần kiểm toán định kỳ.`,
      estDays: 15,
      ktvCount: 3,
    }));

    const plan2026 = this.planRepo.create({
      name: 'Kế hoạch kiểm toán năm 2026',
      year: 2026,
      status: 'Approved',
      ownerTeam: 'ToanKhoi',
      approvedBy: caeUser.id,
      approvedAt: new Date('2026-01-05T10:00:00Z'),
      selectedUnits: selectedUnits,
      approvalNotes:
        'Phê duyệt kế hoạch kiểm toán năm 2026 tập trung các mảng rủi ro cao.',
    });
    const savedPlan2026 = await this.planRepo.save(plan2026);
    plans.push(savedPlan2026);
    results.plans++;

    // 5. Audit Engagements
    const engagements: AuditEngagement[] = [];
    const engData = [
      {
        name: 'Kiểm toán Quy trình Tín dụng và Bảo đảm - Chi nhánh Hà Nội',
        universe:
          universeItems.find((u) => u.name.includes('Tín dụng cá nhân')) ||
          universeItems[0],
        status: 'Completed',
        workspaceStatus: 'Closed',
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        lead: auditor1,
        team: [
          {
            userId: auditor1.id,
            fullName: auditor1.fullName,
            role: 'Trưởng đoàn',
          },
          {
            userId: auditor4.id,
            fullName: auditor4.fullName,
            role: 'Thành viên',
          },
          {
            userId: auditor5.id,
            fullName: auditor5.fullName,
            role: 'Thành viên',
          },
        ],
      },
      {
        name: 'Kiểm toán Hệ thống Core Banking và An toàn thông tin - Khối Công nghệ',
        universe:
          universeItems.find((u) =>
            u.name.includes('Bảo mật & An ninh thông tin'),
          ) || universeItems[4],
        status: 'Completed',
        workspaceStatus: 'Closed',
        startDate: '2026-03-01',
        endDate: '2026-03-25',
        lead: auditor2,
        team: [
          {
            userId: auditor2.id,
            fullName: auditor2.fullName,
            role: 'Trưởng đoàn',
          },
          {
            userId: auditor3.id,
            fullName: auditor3.fullName,
            role: 'Thành viên',
          },
        ],
      },
      {
        name: 'Kiểm toán Quy trình Huy động vốn và Giao dịch quầy - Chi nhánh Sài Gòn',
        universe:
          universeItems.find((u) => u.name.includes('Huy động vốn')) ||
          universeItems[1],
        status: 'Reporting',
        workspaceStatus: 'ReadyToClose',
        startDate: '2026-04-10',
        endDate: '2026-05-10',
        lead: auditor1,
        team: [
          {
            userId: auditor1.id,
            fullName: auditor1.fullName,
            role: 'Trưởng đoàn',
          },
          {
            userId: auditor5.id,
            fullName: auditor5.fullName,
            role: 'Thành viên',
          },
        ],
      },
      {
        name: 'Kiểm toán Công tác Phòng chống rửa tiền (AML) - Khối Tuân thủ',
        universe:
          universeItems.find((u) => u.name.includes('AML')) || universeItems[7],
        status: 'Fieldwork',
        workspaceStatus: 'InProgress',
        startDate: '2026-05-15',
        endDate: '2026-06-15',
        lead: auditor2,
        team: [
          {
            userId: auditor2.id,
            fullName: auditor2.fullName,
            role: 'Trưởng đoàn',
          },
          {
            userId: auditor3.id,
            fullName: auditor3.fullName,
            role: 'Thành viên',
          },
          {
            userId: auditor4.id,
            fullName: auditor4.fullName,
            role: 'Thành viên',
          },
        ],
      },
      {
        name: 'Kiểm toán Quy trình Vận hành Thẻ - Trung tâm Thẻ HO',
        universe:
          universeItems.find((u) => u.name.includes('Vận hành thẻ')) ||
          universeItems[9],
        status: 'Planning',
        workspaceStatus: 'Open',
        startDate: '2026-07-01',
        endDate: '2026-07-20',
        lead: auditor1,
        team: [
          {
            userId: auditor1.id,
            fullName: auditor1.fullName,
            role: 'Trưởng đoàn',
          },
          {
            userId: auditor4.id,
            fullName: auditor4.fullName,
            role: 'Thành viên',
          },
        ],
      },
    ];

    for (const data of engData) {
      const e = this.engagementRepo.create({
        name: data.name,
        planId: savedPlan2026.id,
        legacyPlanName: savedPlan2026.name,
        status: data.status,
        workspaceStatus: data.workspaceStatus,
        startDate: data.startDate,
        endDate: data.endDate,
        sourceAuditUniverseId: data.universe.id,
        riskLevel: data.universe.dynamicRiskRating,
        residualRiskScore: data.universe.riskScore,
        engagementType: 'Planned',
        ownerTeam: data.universe.ownerTeam,
        auditCategory: data.universe.auditCategory,
        legacyAuditedDepartment: data.universe.department,
        branchName: data.universe.department,
        leadAuditorId: data.lead.id,
        legacyLeadAuditor: data.lead.fullName,
        teamMembers: data.team,
        budgetDays: 15,
        actualDays: data.status === 'Completed' ? 14.5 : undefined,
      });
      const savedE = await this.engagementRepo.save(e);
      engagements.push(savedE);
      results.engagements++;
    }

    // 6. Working Papers
    const workingPapers: WorkingPaper[] = [];
    const creditEng = engagements.find((e) => e.name.includes('Tín dụng'));
    if (creditEng) {
      const wp1 = this.workingPaperRepo.create({
        engagementId: creditEng.id,
        legacyPlanName: creditEng.legacyPlanName,
        title: 'Kiểm tra hồ sơ cấp tín dụng trên 10 tỷ đồng',
        referenceCode: 'WP-TD-01',
        objectives:
          'Đánh giá tính hợp pháp, hợp quy của hồ sơ vay, sự đầy đủ của tài sản bảo đảm và chữ ký phê duyệt.',
        riskDescription:
          'Giải ngân khi chưa hoàn tất hồ sơ thế chấp hoặc phê duyệt vượt thẩm quyền dẫn đến nguy cơ tranh chấp pháp lý.',
        methodology:
          'Chọn mẫu hệ thống các khoản giải ngân lớn trong Q4/2025 để đối chiếu.',
        procedures:
          '1. Thu thập danh sách giải ngân;\n2. Đối chiếu hồ sơ phê duyệt tín dụng;\n3. Kiểm tra tính hợp lệ của chữ ký thế chấp.',
        conclusion:
          'Phát hiện 01 trường hợp giải ngân thiếu chữ ký bảo lãnh tại Chi nhánh Hà Nội.',
        status: 'Approved',
        creatorId: auditor4.id,
        legacyCreator: auditor4.fullName,
        reviewerId: auditor1.id,
        legacyReviewedBy: auditor1.fullName,
        submittedAt: new Date('2026-02-15T08:00:00Z'),
        reviewedAt: new Date('2026-02-20T10:00:00Z'),
        controlAssessments: [
          {
            controlId: 'CTRL-TD-01',
            controlDescription:
              'Kiểm tra chéo chứng từ bảo đảm trước khi giải ngân',
            designEffectiveness: 'Effective',
            operatingEffectiveness: 'Ineffective',
            testConclusion:
              'Kiểm soát thiết kế tốt nhưng vận hành yếu do bỏ sót lỗi ký bảo lãnh.',
          },
        ],
      });
      const savedWp1 = await this.workingPaperRepo.save(wp1);
      workingPapers.push(savedWp1);
      results.workingPapers++;

      const wp2 = this.workingPaperRepo.create({
        engagementId: creditEng.id,
        legacyPlanName: creditEng.legacyPlanName,
        title: 'Kiểm tra công tác định giá tài sản bảo đảm là bất động sản',
        referenceCode: 'WP-TD-02',
        objectives:
          'Đánh giá tính độc lập của việc định giá, mức độ chính xác so với thị trường.',
        conclusion:
          'Giá trị định giá cơ bản phù hợp với quy định chung, biên độ sai lệch chấp nhận được.',
        status: 'Approved',
        creatorId: auditor5.id,
        legacyCreator: auditor5.fullName,
        reviewerId: auditor1.id,
        legacyReviewedBy: auditor1.fullName,
        submittedAt: new Date('2026-02-18T09:00:00Z'),
        reviewedAt: new Date('2026-02-22T11:00:00Z'),
      });
      const savedWp2 = await this.workingPaperRepo.save(wp2);
      workingPapers.push(savedWp2);
      results.workingPapers++;
    }

    const coreEng = engagements.find((e) => e.name.includes('Core Banking'));
    if (coreEng) {
      const wp3 = this.workingPaperRepo.create({
        engagementId: coreEng.id,
        legacyPlanName: coreEng.legacyPlanName,
        title: 'Đánh giá quản lý tài khoản đặc quyền trên hệ thống Core',
        referenceCode: 'WP-IT-01',
        objectives:
          'Đám bảo các tài khoản admin được phân quyền tối thiểu và có phê duyệt hợp lệ.',
        riskDescription:
          'Tài khoản đặc quyền không được kiểm soát có nguy cơ sửa đổi số dư khống hoặc đánh cắp dữ liệu khách hàng.',
        conclusion:
          'Phát hiện tài khoản kiểm thử (test_admin01) còn hoạt động với đặc quyền admin trên môi trường Production.',
        status: 'Approved',
        creatorId: auditor3.id,
        legacyCreator: auditor3.fullName,
        reviewerId: auditor2.id,
        legacyReviewedBy: auditor2.fullName,
        submittedAt: new Date('2026-03-12T08:00:00Z'),
        reviewedAt: new Date('2026-03-18T10:00:00Z'),
        controlAssessments: [
          {
            controlId: 'CTRL-IT-03',
            controlDescription: 'Dọn dẹp định kỳ tài khoản tạm sau golive',
            designEffectiveness: 'Effective',
            operatingEffectiveness: 'Ineffective',
            testConclusion:
              'Quy trình có quy định nhưng phòng IT vận hành không thực hiện dọn dẹp.',
          },
        ],
      });
      const savedWp3 = await this.workingPaperRepo.save(wp3);
      workingPapers.push(savedWp3);
      results.workingPapers++;
    }

    const amlEng = engagements.find((e) => e.name.includes('AML'));
    if (amlEng) {
      const wp4 = this.workingPaperRepo.create({
        engagementId: amlEng.id,
        legacyPlanName: amlEng.legacyPlanName,
        title: 'Kiểm tra quy trình báo cáo giao dịch giá trị lớn (STR)',
        referenceCode: 'WP-AML-01',
        objectives:
          'Xác minh việc lập báo cáo giao dịch đáng ngờ tuân thủ Luật AML.',
        conclusion:
          'Kiểm toán đang tiến hành thu thập mẫu dữ liệu báo cáo để đối chiếu.',
        status: 'Draft',
        creatorId: auditor4.id,
        legacyCreator: auditor4.fullName,
        reviewerId: auditor2.id,
        legacyReviewedBy: auditor2.fullName,
      });
      const savedWp4 = await this.workingPaperRepo.save(wp4);
      workingPapers.push(savedWp4);
      results.workingPapers++;
    }

    // 7. Seed Sample Batches & Samples
    const creditWp = workingPapers.find(
      (wp) => wp.referenceCode === 'WP-TD-01',
    );
    if (creditWp && creditEng) {
      const batch = this.auditSampleBatchRepo.create({
        batchName: 'Danh sách hồ sơ tín dụng giải ngân lớn Q4/2025',
        sampleType: SampleType.DETAIL,
        samplingMethod: SamplingMethod.SYSTEMATIC,
        populationSize: 150,
        sampleSize: 10,
        confidenceLevel: 95,
        tolerableError: 5,
        populationSource: 'Hệ thống SmartLending LPBank',
        status: 'Finalized',
        engagementId: creditEng.id,
        workingPaperId: creditWp.id,
        createdBy: auditor4.fullName,
      });
      const savedBatch = await this.auditSampleBatchRepo.save(batch);
      results.sampleBatches++;

      const samplesData = [
        {
          name: 'Công ty Cổ phần Đầu tư Hoàng Phan',
          cif: 'CIF00213',
          result: TestResult.PASS,
          notes: 'Hồ sơ đầy đủ, phê duyệt đúng thẩm quyền',
        },
        {
          name: 'Nguyễn Văn A',
          cif: 'CIF00942',
          result: TestResult.FAIL,
          notes: 'Thiếu chữ ký bảo lãnh trên Hợp đồng thế chấp',
        },
        {
          name: 'Trần Thị B',
          cif: 'CIF00319',
          result: TestResult.PASS,
          notes: 'Hồ sơ đầy đủ',
        },
        {
          name: 'Công ty TNHH MTV Thành Công',
          cif: 'CIF00827',
          result: TestResult.PASS,
          notes: 'Phê duyệt đúng thẩm quyền',
        },
        {
          name: 'Phạm Văn C',
          cif: 'CIF00612',
          result: TestResult.PASS,
          notes: 'Hồ sơ đầy đủ',
        },
        {
          name: 'Lê Hoàng Hải',
          cif: 'CIF00741',
          result: TestResult.PASS,
          notes: 'Hồ sơ đầy đủ',
        },
        {
          name: 'Nguyễn Thị Hương',
          cif: 'CIF00511',
          result: TestResult.PASS,
          notes: 'Hồ sơ đầy đủ',
        },
        {
          name: 'Công ty CP Đầu tư & Phát triển Việt Nam',
          cif: 'CIF00439',
          result: TestResult.EXCEPTION,
          notes: 'Tài liệu bị mờ, đã yêu cầu quét lại bản gốc',
        },
        {
          name: 'Vũ Minh Đức',
          cif: 'CIF00129',
          result: TestResult.PASS,
          notes: 'Hồ sơ đầy đủ',
        },
        {
          name: 'Hoàng Thị Dung',
          cif: 'CIF00984',
          result: TestResult.PASS,
          notes: 'Hồ sơ đầy đủ',
        },
      ];

      let seq = 1;
      for (const sd of samplesData) {
        const s = this.auditSampleRepo.create({
          batchId: savedBatch.id,
          sequenceNo: seq++,
          sampleType: SampleType.DETAIL,
          cifOrAccount: sd.cif,
          customerName: sd.name,
          customerType: sd.name.includes('Công ty') ? 'KHDN' : 'KHCN',
          productName: 'Cho vay sản xuất kinh doanh',
          branchCode: 'CN_HN',
          region: 'Vùng 1 (Miền Bắc)',
          managingBranchCode: 'CNHN',
          managingBranchName: 'Chi nhánh Hà Nội',
          operationType: 'TD',
          businessProcess: 'Quy trình cấp tín dụng',
          proposerOfficer: 'Trần Văn Thiết kế',
          appraiserOfficer: 'Phạm Thị Thẩm định',
          businessLeader: 'Giám đốc Chi nhánh Hà Nội',
          testResult: sd.result,
          testNotes: sd.notes,
          testedAt: new Date('2026-02-14T09:00:00Z'),
          testedBy: auditor4.fullName,
        });
        await this.auditSampleRepo.save(s);
        results.samples++;
      }
    }

    // 8. Seed Audit Findings
    const findings: AuditFinding[] = [];
    if (creditEng && creditWp) {
      const f1 = this.findingRepo.create({
        workingPaperId: creditWp.id,
        wpTitle: creditWp.title,
        engagementId: creditEng.id,
        findingTitle:
          'Hồ sơ tín dụng giải ngân thiếu chữ ký bảo lãnh tại Chi nhánh Hà Nội',
        findingCode: 'FD-TD-01',
        branchCode: 'CN_HN',
        region: 'Vùng 1 (Miền Bắc)',
        legacyManagingBranchCode: 'CNHN',
        legacyManagingBranchName: 'Chi nhánh Hà Nội',
        operationType: 'TD',
        legacyBusinessProcess: 'Quy trình giải ngân và quản lý tài sản bảo đảm',
        cifOrAccount: 'CIF00942',
        customerName: 'Nguyễn Văn A',
        productName: 'Hợp đồng tín dụng cá nhân trên 10 tỷ',
        customerType: 'KHCN',
        condition:
          'Trong quá trình kiểm tra hồ sơ giải ngân khoản vay trị giá 12 tỷ đồng của khách hàng Nguyễn Văn A ngày 15/12/2025, đoàn kiểm toán phát hiện Hợp đồng thế chấp tài sản số 102/HDTC thiếu chữ ký xác nhận của bên bảo lãnh thứ ba (bố mẹ đẻ của khách hàng) dù tài sản thuộc sở hữu chung.',
        riskGroupGeneral: 'Rủi ro Pháp lý và Tuân thủ',
        riskGroupDetail: 'Thiếu sót thủ tục pháp lý tài sản bảo đảm',
        consequence:
          'Nếu xảy ra nợ quá hạn hoặc tranh chấp, ngân hàng không thể thực hiện phát mại tài sản bảo đảm để thu hồi nợ, dẫn đến nguy cơ mất vốn và phát sinh nợ xấu.',
        cause:
          'Giao dịch viên và kiểm soát viên bỏ sót khâu kiểm tra chữ ký gốc trên bản cứng; Lãnh đạo chi nhánh phê duyệt nhanh do áp lực tiến độ giải ngân cuối năm.',
        legacyProposerOfficer: 'Trần Văn Thiết kế',
        legacyAppraiserOfficer: 'Phạm Thị Thẩm định',
        legacyBusinessLeader: 'Giám đốc Chi nhánh Hà Nội',
        rootCauseCategory: 'People',
        rootCauseDetails:
          'Nhân viên chưa tuân thủ quy trình kiểm soát đối chiếu chữ ký gốc.',
        recommendation:
          'Chi nhánh Hà Nội phối hợp với khách hàng liên hệ bên bảo lãnh bổ sung chữ ký hợp lệ trước ngày 30/06/2026. Tổ chức họp kiểm điểm trách nhiệm cá nhân liên quan.',
        recommendationTarget: 'ĐVKD',
        recommendationType: 'Publish',
        riskLevel: 'High',
        status: 'Confirmed',
        auditeeResponse:
          'Chi nhánh ghi nhận và đang làm việc với khách hàng để bổ sung chữ ký người bảo lãnh.',
        criteria:
          'Quy định quản lý tài sản thế chấp LPBank ban hành theo QĐ số 412/2023.',
        findingCategory: 'HoatDong',
        findingNature: 'TuanThu',
        reportedByAuditorId: auditor4.id,
        responsibleUnitId: creditEng.id,
      });
      const savedF1 = await this.findingRepo.save(f1);
      findings.push(savedF1);
      results.findings++;

      const samples = await this.auditSampleRepo.find({
        where: { cifOrAccount: 'CIF00942' },
      });
      if (samples.length > 0) {
        await this.auditSampleRepo.update(samples[0].id, {
          findingId: savedF1.id,
        });
      }
    }

    const itWp = workingPapers.find((wp) => wp.referenceCode === 'WP-IT-01');
    if (coreEng && itWp) {
      const f2 = this.findingRepo.create({
        workingPaperId: itWp.id,
        wpTitle: itWp.title,
        engagementId: coreEng.id,
        findingTitle:
          'Tài khoản kiểm thử (test account) có đặc quyền quản trị hoạt động trên môi trường Production',
        findingCode: 'FD-IT-01',
        branchCode: 'HO_IT',
        region: 'Hội sở',
        legacyManagingBranchCode: 'HO_IT',
        legacyManagingBranchName: 'Khối Công nghệ thông tin',
        operationType: 'CNTT',
        legacyBusinessProcess:
          'Quy trình quản lý định danh và truy cập đặc quyền (IAM)',
        cifOrAccount: 'test_admin01',
        customerName: 'Không có (Tài khoản nội bộ)',
        productName: 'Hệ thống Core Banking',
        customerType: 'N/A',
        condition:
          'Kiểm toán phát hiện tài khoản mang tên "test_admin01" được tạo phục vụ kiểm thử cho dự án Golive Core Banking tháng 10/2025 vẫn đang hoạt động với đầy đủ quyền quản trị (Super Admin) trên môi trường Production mà không bị khóa hoặc dọn dẹp.',
        riskGroupGeneral: 'Rủi ro An toàn thông tin',
        riskGroupDetail: 'Quản lý truy cập đặc quyền không an toàn',
        consequence:
          'Kẻ xấu có thể chiếm đoạt tài khoản này để can thiệp trái phép vào cơ sở dữ liệu số dư, chuyển tiền khống hoặc trích xuất dữ liệu giao dịch nhạy cảm của ngân hàng.',
        cause:
          'Bộ phận quản trị hệ thống Core không thực hiện kiểm tra định kỳ tài khoản tạm; quy trình bàn giao sau dự án bỏ sót bước dọn dẹp tài khoản kiểm thử.',
        rootCauseCategory: 'Process',
        rootCauseDetails:
          'Quy trình bàn giao golive dự án chưa chuẩn hóa kiểm soát tài khoản truy cập.',
        recommendation:
          'Yêu cầu Bộ phận vận hành IT thực hiện khóa ngay tài khoản "test_admin01" và rà soát toàn bộ tài khoản đặc quyền trên hệ thống Core Banking trước ngày 15/06/2026.',
        recommendationTarget: 'HO',
        recommendationType: 'Publish',
        riskLevel: 'Critical',
        status: 'Open',
        auditeeResponse:
          'Khối CNTT đã tiến hành khóa tài khoản test_admin01 ngay khi đoàn kiểm toán thông báo.',
        criteria:
          'Quy chuẩn an toàn bảo mật hạ tầng Core Banking LPBank ban hành theo QĐ số 812/2024.',
        findingCategory: 'CNTT',
        findingNature: 'HeThong',
        reportedByAuditorId: auditor3.id,
        responsibleUnitId: coreEng.id,
      });
      const savedF2 = await this.findingRepo.save(f2);
      findings.push(savedF2);
      results.findings++;
    }

    // 9. Seed Recommendations
    for (const f of findings) {
      const r = this.recRepo.create({
        findingId: f.id,
        finding: f.findingTitle,
        recommendation: f.recommendation,
        legacyDepartment: amlEng?.branchName || 'Khối Tuân thủ',
        status: f.status === 'Resolved' ? 'Completed' : 'InProgress',
        dueDate: '2026-06-30',
      });
      await this.recRepo.save(r);
      results.recommendations++;
    }

    // 10. Seed Audit Reports
    if (creditEng) {
      const rep1 = this.auditReportRepo.create({
        engagementId: creditEng.id,
        plan: creditEng.legacyPlanName,
        title:
          'Báo cáo kiểm toán nội bộ - Quy trình Tín dụng và Bảo đảm Chi nhánh Hà Nội',
        executiveSummary:
          'Kết quả kiểm toán cho thấy Chi nhánh Hà Nội đã cơ bản tuân thủ quy trình tín dụng hiện hành. Tuy nhiên, vẫn còn tồn tại một số sai sót về mặt hồ sơ tài sản bảo đảm, đáng chú ý là trường hợp giải ngân thiếu chữ ký bên bảo lãnh thứ ba...',
        scope:
          'Rà soát toàn bộ hồ sơ cấp tín dụng giải ngân trong năm 2025 tại Chi nhánh Hà Nội.',
        methodology:
          'Sử dụng phương pháp chọn mẫu hệ thống kết hợp đánh giá kiểm soát vận hành thực tế.',
        overallConclusion:
          'Xếp hạng: Cần cải thiện (Needs Improvement) do còn tồn tại rủi ro High về bảo đảm thế chấp.',
        auditRating: 'NeedsImprovement',
        status: 'Issued',
        date: '2026-03-15',
        issuedBy: caeUser.fullName,
        isSigned: true,
        signedAt: new Date('2026-03-15T10:00:00Z'),
      });
      await this.auditReportRepo.save(rep1);
      results.reports++;
    }

    if (coreEng) {
      const rep2 = this.auditReportRepo.create({
        engagementId: coreEng.id,
        plan: coreEng.legacyPlanName,
        title:
          'Báo cáo kiểm toán nội bộ - Hệ thống Core Banking và An toàn thông tin',
        executiveSummary:
          'Môi trường vận hành Core Banking cơ bản ổn định, tuy nhiên hệ thống IAM quản lý truy cập đặc quyền ghi nhận phát hiện mức rủi ro Critical liên quan đến tài khoản kiểm thử golive.',
        scope:
          'Đánh giá an toàn thông tin hệ thống Core Banking và quy trình cấp quyền admin trong năm 2025-2026.',
        methodology:
          'Kiểm tra cấu hình phân quyền hệ thống, rà soát nhật ký truy cập và thực nghiệm kiểm thử.',
        overallConclusion:
          'Xếp hạng: Không đạt (Unsatisfactory) do tồn tại rủi ro bảo mật nghiêm trọng.',
        auditRating: 'Unsatisfactory',
        status: 'Issued',
        date: '2026-04-10',
        issuedBy: caeUser.fullName,
        isSigned: true,
        signedAt: new Date('2026-04-10T11:00:00Z'),
      });
      await this.auditReportRepo.save(rep2);
      results.reports++;
    }

    // 11. Monitoring Alerts (Total 100)
    for (let i = 0; i < 100; i++) {
      const randomBranch =
        dvkdDepts.length > 0
          ? dvkdDepts[Math.floor(Math.random() * dvkdDepts.length)]
          : null;
      const alert = this.alertRepo.create({
        title: `Cảnh báo giao dịch đáng ngờ #${i}`,
        description: `Phát hiện giao dịch mã TXN${i} có dấu hiệu rửa tiền hoặc vi phạm hạn mức.`,
        category: i % 4 === 0 ? 'AML' : 'Operational',
        riskLevel: i % 6 === 0 ? 'High' : 'Medium',
        unitName: randomBranch ? randomBranch.name : 'Chi nhánh Hà Nội',
        status: i < 70 ? 'Resolved' : 'Open',
        relatedData: { txId: `TXN${i}`, val: Math.random() * 1000000 },
      });
      await this.alertRepo.save(alert);
      results.alerts++;
    }

    // 12. Seed Aligned KRI Alerts (Tuyến 2)
    try {
      await this.userRepo.query(`
        INSERT INTO "kri_alerts" ("kriCode", "kriName", "departmentName", "currentValue", "thresholdValue", "severity", "status", "createdAt", "updatedAt") VALUES
        ('KRI_NPL', 'Tỷ lệ nợ xấu (NPL Ratio)', 'Chi nhánh Hà Nội', '3.45%', '> 3.0%', 'High', 'Active', NOW(), NOW()),
        ('KRI_IT_DOWNTIME', 'Thời gian gián đoạn giao dịch Core Banking', 'Khối Công nghệ thông tin', '18 phút', '> 10 phút', 'Critical', 'Active', NOW(), NOW()),
        ('KRI_AML_ALERTS', 'Cảnh báo giao dịch đáng ngờ rửa tiền', 'Khối Tuân thủ', '85 vụ/tuần', '> 50 vụ/tuần', 'High', 'Active', NOW(), NOW()),
        ('KRI_CASH_LIMIT', 'Vượt hạn mức tồn quỹ tiền mặt cuối ngày', 'Chi nhánh Sài Gòn', '12 tỷ VND', '> 10 tỷ VND', 'Medium', 'Active', NOW(), NOW())
      `);
      console.log('✅ Đã tạo các bản ghi KRI khớp với Audit Universe');
    } catch (e) {
      console.warn('⚠️  Không thể seed KRI alerts:', e.message);
    }

    return results;
  }

  async clearAll() {
    const tables = [
      'audit_reports',
      'working_papers',
      'audit_samples',
      'audit_sample_batches',
      'recommendations',
      'audit_findings',
      'audit_engagements',
      'audit_plans',
      'risk_assessments',
      'audit_universe',
      'departments',
      'risk_criteria',
      'security_alerts',
      'monitoring_alerts',
      'kri_alerts',
    ];
    // SECURITY (CS-SQLI-001): Validate table names against a known whitelist
    // to prevent SQL injection if the list is ever made dynamic.
    const allowedTables = new Set(tables);
    for (const table of tables) {
      try {
        if (!allowedTables.has(table) || !/^[a-z_]+$/.test(table)) {
          console.warn(`[SeederService] Skipping invalid table name: ${table}`);
          continue;
        }
        await this.userRepo.query(`TRUNCATE TABLE "${table}" CASCADE`);
      } catch (e) {
        // Table might not exist yet or name mismatch
      }
    }
    return { success: true };
  }

  /**
   * Seed cơ cấu tổ chức LPBank đầy đủ với unitType
   * Gọi endpoint POST /seeder/org-structure
   */
  async seedOrgStructure() {
    let created = 0;
    let updated = 0;
    let universeCreated = 0;
    let universeUpdated = 0;
    const errors: string[] = [];

    for (const item of LPBANK_ORG_SEED) {
      try {
        const normalizedType = normalizeUnitType(item.name, item.unitType);
        // 1. Seed to Department
        const existing = await this.deptRepo.findOne({
          where: { code: item.code },
        });
        if (existing) {
          // Update existing record with new fields
          await this.deptRepo.update(existing.id, {
            name: item.name,
            unitType: normalizedType,

            parent: item.parent || undefined,
            status: item.status || 'Active',
          });
          updated++;
        } else {
          // Create new
          const dept = this.deptRepo.create({
            code: item.code,
            name: item.name,
            unitType: normalizedType,

            parent: item.parent || undefined,
            status: item.status || 'Active',
          });
          await this.deptRepo.save(dept);
          created++;
        }

        // 2. Seed to AuditUniverse (as requested)
        const universeExisting = await this.universeRepo.findOne({
          where: { departmentCode: item.code },
        });
        const category =
          normalizedType === 'ChiNhanh' ||
          normalizedType === 'BDT' ||
          normalizedType === 'TrungTam'
            ? 'ChiNhanh'
            : normalizedType === 'PGD'
              ? 'PGD'
              : 'HoiSo';
        const owner = ['ChiNhanh', 'PGD', 'TrungTam', 'BDT'].includes(
          normalizedType,
        )
          ? 'PKT_DVKD'
          : 'PKT_HoiSo';

        if (universeExisting) {
          await this.universeRepo.update(universeExisting.id, {
            name: item.name,
            description: `Đơn vị thuộc Cơ cấu tổ chức: ${item.name}`,
            department: item.name,
            auditCategory: category,
            ownerTeam: owner,
          });
          universeUpdated++;
        } else {
          const u = this.universeRepo.create({
            name: item.name,
            description: `Đơn vị thuộc Cơ cấu tổ chức: ${item.name}`,
            department: item.name,
            departmentCode: item.code,
            auditCategory: category,
            ownerTeam: owner,
            financialSize: 2.5,
            operationalRiskScore: 2.5,
            pastFindingsScore: 2.5,
            riskScore: undefined,
            dynamicRiskRating: undefined,
            nextAuditYear: new Date().getFullYear(),
            status: 'Active',
          });
          await this.universeRepo.save(u);
          universeCreated++;
        }
      } catch (e) {
        errors.push(`${item.code}: ${e.message}`);
      }
    }

    return {
      message: 'Seed cơ cấu tổ chức LPBank & Audit Universe hoàn tất',
      created,
      updated,
      universeCreated,
      universeUpdated,
      total: LPBANK_ORG_SEED.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async seedRiskCriteria() {
    const criteriaData = [
      // ChiNhanh (Chi nhánh)
      {
        name: 'Tỷ lệ nợ xấu và nợ nhóm 2 (Chi nhánh)',
        weight: 30,
        category: 'Rủi ro Tín dụng',
        auditCategory: 'ChiNhanh',
        description:
          'Tỷ lệ nợ xấu (nhóm 3-5) và nợ cần chú ý (nhóm 2) trên tổng dư nợ cấp tín dụng của đơn vị chi nhánh.',
        status: 'Active',
      },
      {
        name: 'Mức độ tập trung rủi ro tín dụng (Chi nhánh)',
        weight: 20,
        category: 'Rủi ro Tín dụng',
        auditCategory: 'ChiNhanh',
        description:
          'Mức độ tập trung dư nợ vào một nhóm khách hàng liên quan hoặc ngành nghề rủi ro cao tại chi nhánh.',
        status: 'Active',
      },
      {
        name: 'Tỷ lệ lỗi tác nghiệp và sai sót quy trình (Chi nhánh)',
        weight: 20,
        category: 'Rủi ro Hoạt động',
        auditCategory: 'ChiNhanh',
        description:
          'Tần suất xảy ra các lỗi tác nghiệp và sai sót quy trình nghiệp vụ được phát hiện qua tự kiểm tra.',
        status: 'Active',
      },
      {
        name: 'Tỷ lệ biến động nhân sự và năng lực cán bộ (Chi nhánh)',
        weight: 10,
        category: 'Rủi ro Hoạt động',
        auditCategory: 'ChiNhanh',
        description:
          'Tỷ lệ luân chuyển, nghỉ việc của các vị trí chủ chốt và tỷ lệ nhân sự chưa đạt chuẩn năng lực nghiệp vụ.',
        status: 'Active',
      },
      {
        name: 'Thiệt hại tài chính từ sự cố vận hành (Chi nhánh)',
        weight: 10,
        category: 'Rủi ro Hoạt động',
        auditCategory: 'ChiNhanh',
        description:
          'Tổng giá trị tổn thất tài chính phát sinh từ các sự cố vận hành tại chi nhánh.',
        status: 'Active',
      },
      {
        name: 'Rủi ro pháp lý từ khiếu nại khách hàng và hợp đồng (Chi nhánh)',
        weight: 10,
        category: 'Rủi ro Tuân thủ',
        auditCategory: 'ChiNhanh',
        description:
          'Tần suất và tính nghiêm trọng của các vụ khiếu nại khách hàng, tranh chấp hợp đồng.',
        status: 'Active',
      },

      // HoiSo (Hội sở)
      {
        name: 'Mức độ tuân thủ quy chuẩn pháp luật và kiến nghị thanh tra (Hội sở)',
        weight: 30,
        category: 'Rủi ro Tuân thủ',
        auditCategory: 'HoiSo',
        description:
          'Mức độ thực hiện các kiến nghị thanh tra NHNN, kiểm toán độc lập và việc chấp hành các giới hạn an toàn pháp lý tại Hội sở theo TT83.',
        status: 'Active',
      },
      {
        name: 'Tỷ lệ khả năng chi trả và dự trữ thanh khoản (Hội sở)',
        weight: 30,
        category: 'Rủi ro Thanh khoản',
        auditCategory: 'HoiSo',
        description:
          'Mức độ duy trì các giới hạn an toàn về khả năng chi trả và tỷ lệ dự trữ thanh khoản cấp Hội sở.',
        status: 'Active',
      },
      {
        name: 'Biến động giá trị danh mục đầu tư và tỷ giá (Hội sở)',
        weight: 20,
        category: 'Rủi ro Thị trường',
        auditCategory: 'HoiSo',
        description:
          'Độ lệch giá trị hợp lý của danh mục đầu tư và trạng thái ngoại tệ ròng của toàn ngân hàng.',
        status: 'Active',
      },
      {
        name: 'Mức độ nhạy cảm của thu nhập lãi thuần đối với lãi suất (Hội sở)',
        weight: 20,
        category: 'Rủi ro Lãi suất sổ ngân hàng',
        auditCategory: 'HoiSo',
        description:
          'Ảnh hưởng dự kiến đối với thu nhập lãi thuần (NII) và giá trị kinh tế của vốn chủ sở hữu khi lãi suất biến động.',
        status: 'Active',
      },

      // HeThong (Hệ thống CNTT)
      {
        name: 'Rủi ro Hệ thống CNTT và An ninh mạng (Hệ thống)',
        weight: 50,
        category: 'Rủi ro Hoạt động',
        auditCategory: 'HeThong',
        description:
          'Số giờ gián đoạn dịch vụ hệ thống CNTT/Core banking và tần suất các sự cố bảo mật thông tin.',
        status: 'Active',
      },
      {
        name: 'Tỷ lệ lỗi tác nghiệp và sai sót quy trình (Hệ thống)',
        weight: 25,
        category: 'Rủi ro Hoạt động',
        auditCategory: 'HeThong',
        description:
          'Tần suất lỗi trong vận hành hệ thống phần cứng, mạng và ứng dụng công nghệ.',
        status: 'Active',
      },
      {
        name: 'Tỷ lệ biến động nhân sự và năng lực cán bộ (Hệ thống)',
        weight: 25,
        category: 'Rủi ro Hoạt động',
        auditCategory: 'HeThong',
        description:
          'Biến động nhân sự chuyên trách công nghệ thông tin và mức độ đáp ứng năng lực kỹ thuật.',
        status: 'Active',
      },

      // PGD (Phòng giao dịch)
      {
        name: 'Tỷ lệ lỗi tác nghiệp và sai sót quy trình (PGD)',
        weight: 40,
        category: 'Rủi ro Hoạt động',
        auditCategory: 'PGD',
        description:
          'Tần suất các sai sót giao dịch tiền mặt, chứng từ tại quầy giao dịch.',
        status: 'Active',
      },
      {
        name: 'Tần suất vi phạm và cảnh báo giao dịch đáng ngờ AML (PGD)',
        weight: 30,
        category: 'Rủi ro Tuân thủ',
        auditCategory: 'PGD',
        description:
          'Mức độ tuân thủ quy định phòng chống rửa tiền và xử lý cảnh báo AML giao dịch qua quầy.',
        status: 'Active',
      },
      {
        name: 'Thiệt hại tài chính từ sự cố vận hành (PGD)',
        weight: 30,
        category: 'Rủi ro Hoạt động',
        auditCategory: 'PGD',
        description:
          'Thiệt hại tài chính phát sinh từ rủi ro đạo đức hoặc lỗi sai sót kiểm ngân.',
        status: 'Active',
      },

      // ChuyenDe (Nghiệp vụ)
      {
        name: 'Tỷ lệ lỗi tác nghiệp và sai sót quy trình (Nghiệp vụ)',
        weight: 35,
        category: 'Rủi ro Hoạt động',
        auditCategory: 'ChuyenDe',
        description:
          'Lỗi tác nghiệp phát hiện trong phạm vi mảng nghiệp vụ được kiểm toán.',
        status: 'Active',
      },
      {
        name: 'Mức độ tuân thủ quy chuẩn pháp luật và kiến nghị thanh tra (Nghiệp vụ)',
        weight: 35,
        category: 'Rủi ro Tuân thủ',
        auditCategory: 'ChuyenDe',
        description:
          'Tình hình chấp hành pháp luật chuyên ngành đối với mảng nghiệp vụ.',
        status: 'Active',
      },
      {
        name: 'Tỷ lệ biến động nhân sự và năng lực cán bộ (Nghiệp vụ)',
        weight: 30,
        category: 'Rủi ro Hoạt động',
        auditCategory: 'ChuyenDe',
        description:
          'Năng lực chuyên môn của đội ngũ nhân sự vận hành quy trình nghiệp vụ.',
        status: 'Active',
      },
    ];

    for (const data of criteriaData) {
      const criterion = this.riskCriterionRepo.create(data);
      await this.riskCriterionRepo.save(criterion);
    }
  }
}
