import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiskAssessment } from './entities/risk-assessment.entity';
import { RiskProfile } from './entities/risk-profile.entity';
import { RcsaAssessment } from './entities/rcsa-assessment.entity';
import { AuditUniverse } from '../audit-universe/entities/audit-universe.entity';
import { Department } from '../departments/entities/department.entity';
import { RiskControlMatrix } from '../risk-control-matrix/entities/risk-control-matrix.entity';
import { RiskRegister } from '../risk-register/entities/risk-register.entity';
import { AuditPlan } from '../audit-plans/entities/audit-plan.entity';
import { AuditPlanUnit } from '../audit-plans/entities/audit-plan-unit.entity';
import { ResourceDemand } from '../resource-capacity/entities/resource-demand.entity';
import { StaffRoster } from '../resource-capacity/entities/staff-roster.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { MonitoringAlert } from '../continuous-monitoring/entities/monitoring-alert.entity';

export interface RiskSignalItem {
  id: string;
  source: 'KRI' | 'RCSA' | 'CAATS' | 'CAATs' | 'PRIOR_FINDING';
  sourceLabel: string;
  code: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
  observedAt: Date | string;
  details: Record<string, any>;
}

export interface RiskPlanningOverviewResponse {
  year: number;
  step1Scope: {
    totalDepartments: number;
    totalAuditUniverses: number;
    activeUniverses: number;
    coveragePct: number;
    unmappedDepartments: number;
    pendingActions: string[];
  };
  step2Library: {
    totalRiskProfiles: number;
    approvedProfiles: number;
    totalRcmControls: number;
    unlinkedControlsCount: number;
    pendingActions: string[];
  };
  step3Prioritization: {
    totalAssessments: number;
    approvedAssessments: number;
    submittedAssessments: number;
    draftAssessments: number;
    highRiskCount: number;
    totalRiskRegisterItems: number;
    unassessedUniverses: number;
    pendingActions: string[];
  };
  step4Plan: {
    planStatus: string | null;
    candidateCount: number;
    plannedUnitsCount: number;
    totalDemandHours: number;
    totalCapacityHours: number;
    capacityDeficitOrSurplus: number;
    isApproved: boolean;
    pendingActions: string[];
  };
}

@Injectable()
export class RiskPlanningService {
  private readonly logger = new Logger(RiskPlanningService.name);

  constructor(
    @InjectRepository(RiskAssessment)
    private readonly assessmentRepo: Repository<RiskAssessment>,
    @InjectRepository(RiskProfile)
    private readonly riskProfileRepo: Repository<RiskProfile>,
    @InjectRepository(RcsaAssessment)
    private readonly rcsaRepo: Repository<RcsaAssessment>,
    @InjectRepository(AuditUniverse)
    private readonly universeRepo: Repository<AuditUniverse>,
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
    @InjectRepository(RiskControlMatrix)
    private readonly rcmRepo: Repository<RiskControlMatrix>,
    @InjectRepository(RiskRegister)
    private readonly registerRepo: Repository<RiskRegister>,
    @InjectRepository(AuditPlan)
    private readonly planRepo: Repository<AuditPlan>,
    @InjectRepository(AuditPlanUnit)
    private readonly planUnitRepo: Repository<AuditPlanUnit>,
    @InjectRepository(ResourceDemand)
    private readonly demandRepo: Repository<ResourceDemand>,
    @InjectRepository(StaffRoster)
    private readonly staffRepo: Repository<StaffRoster>,
    @InjectRepository(AuditFinding)
    private readonly findingRepo: Repository<AuditFinding>,
    @InjectRepository(MonitoringAlert)
    private readonly alertRepo: Repository<MonitoringAlert>,
  ) {}

  /**
   * GET /risk-planning/overview?year=
   * Trả về chỉ số và việc cần xử lý cho 4 bước trong chu trình lập kế hoạch RBIA.
   */
  async getOverview(year?: number): Promise<RiskPlanningOverviewResponse> {
    const targetYear = Number(year) || new Date().getFullYear();

    // Parallel fetch all metrics across all 4 steps
    const [
      totalDepts,
      totalUniverses,
      activeUniverses,
      unmappedDepts,
      totalProfiles,
      approvedProfiles,
      totalRcm,
      unlinkedRcm,
      assessments,
      totalRegisterItems,
      plan,
      demands,
      staffList,
    ] = await Promise.all([
      this.deptRepo.count(),
      this.universeRepo.count(),
      this.universeRepo.count({ where: { isActive: true } }),
      this.deptRepo.count({ where: { parentId: null as any } }),
      this.riskProfileRepo.count(),
      this.riskProfileRepo.count({ where: { isActive: true } }),
      this.rcmRepo.count(),
      this.rcmRepo.count({ where: { riskProfileId: null as any } }),
      this.assessmentRepo.find({ where: { assessmentYear: targetYear } }),
      this.registerRepo.count({ where: { assessmentYear: targetYear } }),
      this.planRepo.findOne({
        where: { year: targetYear },
        relations: ['planUnits'],
      }),
      this.demandRepo.find(),
      this.staffRepo.find({ where: { status: 'Active' } }),
    ]);

    // 1. Scope actions
    const scopeActions: string[] = [];
    if (totalUniverses === 0) scopeActions.push('Cần khởi tạo danh mục Vũ trụ Kiểm toán');
    if (unmappedDepts > 0) scopeActions.push(`${unmappedDepts} đơn vị chưa được gán đơn vị cha trong cơ cấu`);

    // 2. Library actions
    const libraryActions: string[] = [];
    if (unlinkedRcm > 0) libraryActions.push(`${unlinkedRcm} chốt kiểm soát RCM chưa tham chiếu Risk Profile chuẩn`);

    // 3. Prioritization metrics & actions
    const approvedAssessments = assessments.filter((a) => a.status === 'Approved').length;
    const submittedAssessments = assessments.filter((a) => a.status === 'Submitted').length;
    const draftAssessments = assessments.filter((a) => a.status === 'Draft').length;
    const highRiskCount = assessments.filter(
      (a) => a.riskLevel === 'High' || a.riskLevel === 'Critical' || a.riskLevel?.includes('Hạng 5') || a.riskLevel?.includes('Hạng 4'),
    ).length;
    const unassessedCount = Math.max(0, activeUniverses - assessments.length);

    const prioritizationActions: string[] = [];
    if (submittedAssessments > 0) prioritizationActions.push(`Có ${submittedAssessments} hồ sơ đánh giá rủi ro chờ Trưởng Ban phê duyệt`);
    if (unassessedCount > 0) prioritizationActions.push(`Còn ${unassessedCount} đối tượng kiểm toán chưa hoàn thành đánh giá năm ${targetYear}`);

    // 4. Plan & Capacity metrics & actions
    const planUnitsCount = plan?.planUnits?.length || 0;

    const totalDemandHours = demands.reduce((sum, d) => sum + (d.requiredHours || 0), 0);
    const totalCapacityHours = staffList.length * 1664; // ~208 man-days * 8h
    const capacityDeficitOrSurplus = totalCapacityHours - totalDemandHours;

    const planActions: string[] = [];
    if (!plan) {
      planActions.push(`Chưa khởi tạo dự thảo Kế hoạch kiểm toán năm ${targetYear}`);
    } else if (plan.status !== 'Approved') {
      planActions.push(`Kế hoạch kiểm toán năm đang ở trạng thái ${plan.status}`);
    }
    if (approvedAssessments > planUnitsCount) {
      planActions.push(`Có ${approvedAssessments - planUnitsCount} đối tượng rủi ro đã duyệt chưa đưa vào kế hoạch`);
    }

    return {
      year: targetYear,
      step1Scope: {
        totalDepartments: totalDepts,
        totalAuditUniverses: totalUniverses,
        activeUniverses,
        coveragePct: totalUniverses > 0 ? Math.round((activeUniverses / totalUniverses) * 100) : 0,
        unmappedDepartments: unmappedDepts,
        pendingActions: scopeActions,
      },
      step2Library: {
        totalRiskProfiles: totalProfiles,
        approvedProfiles,
        totalRcmControls: totalRcm,
        unlinkedControlsCount: unlinkedRcm,
        pendingActions: libraryActions,
      },
      step3Prioritization: {
        totalAssessments: assessments.length,
        approvedAssessments,
        submittedAssessments,
        draftAssessments,
        highRiskCount,
        totalRiskRegisterItems: totalRegisterItems,
        unassessedUniverses: unassessedCount,
        pendingActions: prioritizationActions,
      },
      step4Plan: {
        planStatus: plan?.status || null,
        candidateCount: approvedAssessments,
        plannedUnitsCount: planUnitsCount,
        totalDemandHours,
        totalCapacityHours,
        capacityDeficitOrSurplus,
        isApproved: plan?.status === 'Approved',
        pendingActions: planActions,
      },
    };
  }

  /**
   * GET /risk-signals?auditUniverseId=&year=
   * Trả về tín hiệu rủi ro chỉ-đọc hợp nhất từ Tuyến 1 (RCSA), Tuyến 2 (KRI), CAATs và phát hiện kỳ trước.
   */
  async getRiskSignals(
    auditUniverseId?: number,
    year?: number,
  ): Promise<RiskSignalItem[]> {
    const targetYear = Number(year) || new Date().getFullYear();
    const universeId = Number(auditUniverseId) || undefined;
    const signals: RiskSignalItem[] = [];

    // Lấy thông tin universe nếu có
    let universe: AuditUniverse | null = null;
    if (universeId) {
      universe = await this.universeRepo.findOne({ where: { id: universeId } });
    }

    // 1. Tín hiệu Tuyến 2: KRI Alert / EWS từ Continuous Monitoring
    try {
      const alertQb = this.alertRepo.createQueryBuilder('a');
      if (universe?.department) {
        alertQb.where('(a.unitName ILIKE :dept OR a.title ILIKE :dept)', {
          dept: `%${universe.department}%`,
        });
      }
      alertQb.orderBy('a.createdAt', 'DESC').take(15);
      const alerts = await alertQb.getMany();

      for (const al of alerts) {
        signals.push({
          id: `KRI-${al.id}`,
          source: 'KRI',
          sourceLabel: 'Cảnh báo KRI / EWS (Tuyến 2)',
          code: `KRI-${al.id}`,
          title: al.title,
          severity: (al.riskLevel as any) || 'High',
          observedAt: al.createdAt,
          details: {
            category: al.category,
            description: al.description,
            unitName: al.unitName,
            status: al.status,
          },
        });
      }
    } catch (err) {
      this.logger.warn('Failed to load KRI signals:', err);
    }

    // 2. Tín hiệu Tuyến 1: RCSA (Tự đánh giá rủi ro & kiểm soát)
    try {
      const rcsaQb = this.rcsaRepo.createQueryBuilder('rcsa');
      if (universeId) {
        rcsaQb.where('(rcsa.auditUniverseId = :uId OR rcsa.departmentName = :dept)', {
          uId: universeId,
          dept: universe?.department || '',
        });
      }
      rcsaQb.andWhere('rcsa.assessmentYear = :year', { year: targetYear });
      rcsaQb.orderBy('rcsa.createdAt', 'DESC').take(15);
      const rcsas = await rcsaQb.getMany();

      for (const rc of rcsas) {
        signals.push({
          id: `RCSA-${rc.id}`,
          source: 'RCSA',
          sourceLabel: 'Tự đánh giá KSNB (Tuyến 1 RCSA)',
          code: `RCSA-${rc.processName || rc.id}`,
          title: `RCSA: ${rc.processName} - ${rc.riskDescription}`,
          severity: rc.residualRisk >= 4 ? 'High' : rc.residualRisk >= 3 ? 'Medium' : 'Low',
          observedAt: rc.createdAt,
          details: {
            processName: rc.processName,
            controlName: rc.controlName,
            controlEffectiveness: rc.controlEffectiveness,
            actionPlan: rc.actionPlan,
            status: rc.status,
          },
        });
      }
    } catch (err) {
      this.logger.warn('Failed to load RCSA signals:', err);
    }

    // 3. Tín hiệu CAATs & Giám sát liên tục
    try {
      const caatsAlerts = await this.alertRepo.find({
        where: { category: 'Operational' },
        order: { createdAt: 'DESC' },
        take: 10,
      });

      for (const c of caatsAlerts) {
        signals.push({
          id: `CAAT-${c.id}`,
          source: 'CAATS',
          sourceLabel: 'Giám sát kiểm toán liên tục (CAATs)',
          code: `CAAT-${c.id}`,
          title: c.title,
          severity: (c.riskLevel as any) || 'Medium',
          observedAt: c.createdAt,
          details: {
            description: c.description,
            unitName: c.unitName,
            relatedData: c.relatedData,
          },
        });
      }
    } catch (err) {
      this.logger.warn('Failed to load CAAT signals:', err);
    }

    // 4. Phát hiện kiểm toán kỳ trước (Prior Findings)
    try {
      const findingQb = this.findingRepo.createQueryBuilder('f');
      if (universeId) {
        findingQb.where('f.auditUniverseId = :uId', { uId: universeId });
      } else if (universe?.department) {
        findingQb.where('f.auditeeUnit ILIKE :dept', {
          dept: `%${universe.department}%`,
        });
      }
      findingQb.orderBy('f.createdAt', 'DESC').take(15);
      const findings = await findingQb.getMany();

      for (const f of findings) {
        signals.push({
          id: `FINDING-${f.id}`,
          source: 'PRIOR_FINDING',
          sourceLabel: 'Phát hiện kỳ trước (Tuyến 3 Finding)',
          code: f.findingCode || `F-${f.id}`,
          title: f.findingTitle || f.wpTitle || 'Phát hiện kiểm toán',
          severity: (f.riskLevel as any) || 'Medium',
          observedAt: f.createdAt,
          details: {
            status: f.status,
            findingCode: f.findingCode,
            condition: (f as any).condition5c,
            cause: (f as any).cause5c,
            recommendationCount: (f as any).recommendations?.length || 0,
          },
        });
      }
    } catch (err) {
      this.logger.warn('Failed to load Prior Finding signals:', err);
    }

    return signals;
  }
}
