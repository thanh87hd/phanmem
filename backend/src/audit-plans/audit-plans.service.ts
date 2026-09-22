import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { CreateAuditPlanDto } from './dto/create-audit-plan.dto';
import { UpdateAuditPlanDto } from './dto/update-audit-plan.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditPlan } from './entities/audit-plan.entity';
import { AuditPlanUnit } from './entities/audit-plan-unit.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';
import { AuditUniverse } from '../audit-universe/entities/audit-universe.entity';
import { SubmitRevisionDto } from './dto/submit-revision.dto';
import { User } from '../users/entities/user.entity';
import { RiskAssessment } from '../risk-assessments/entities/risk-assessment.entity';
import { KriAlert } from '../risk-indicators/entities/kri-alert.entity';
import { ScopeFilterService } from '../utils/scope-filter.service';
import { isHighRiskAssessment } from '../risk-assessments/helpers/risk-classification.helper';

@Injectable()
export class AuditPlansService {
  constructor(
    @InjectRepository(AuditPlan)
    private readonly auditPlanRepository: Repository<AuditPlan>,
    @InjectRepository(AuditPlanUnit)
    private readonly auditPlanUnitRepository: Repository<AuditPlanUnit>,
    @InjectRepository(AuditEngagement)
    private readonly auditEngagementRepository: Repository<AuditEngagement>,
    @InjectRepository(AuditUniverse)
    private readonly auditUniverseRepository: Repository<AuditUniverse>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  /** GIAS 9.4: Synchronize normalized AuditPlanUnit table with selectedUnits */
  private async syncPlanUnits(planId: number, selectedUnits?: any[]) {
    if (!selectedUnits || !Array.isArray(selectedUnits)) return;
    await this.auditPlanUnitRepository.delete({ planId });
    if (selectedUnits.length === 0) return;

    const unitsToInsert = selectedUnits.map((u) => {
      const unit = new AuditPlanUnit();
      unit.planId = planId;
      unit.universeId = u.universeId || u.id || null;
      unit.universeName = u.universeName || u.name || null;
      unit.riskLevel = u.riskLevel || null;
      unit.justification = u.justification || u.reason || null;
      unit.estDays = u.estDays ? parseFloat(u.estDays) : 0;
      unit.ktvCount = u.ktvCount ? parseInt(u.ktvCount, 10) : 0;
      unit.scheduledMonth = u.scheduledMonth
        ? parseInt(u.scheduledMonth, 10)
        : 1;
      unit.targetQuarter = u.targetQuarter || 'Q1';
      unit.leadAuditorId = u.leadAuditorId || null;
      unit.leadAuditorName = u.leadAuditorName || null;
      unit.assignedTeamMembers = u.assignedTeamMembers || u.members || [];
      return unit;
    });
    await this.auditPlanUnitRepository.save(unitsToInsert);
  }

  async create(createAuditPlanDto: CreateAuditPlanDto) {
    const plan = this.auditPlanRepository.create(createAuditPlanDto);
    const saved = await this.auditPlanRepository.save(plan);
    if (createAuditPlanDto.selectedUnits) {
      await this.syncPlanUnits(saved.id, createAuditPlanDto.selectedUnits);
    }
    return saved;
  }

  async findAll(
    user?: any,
    filters?: { year?: number; status?: string; ownerTeam?: string },
  ) {
    const query = this.auditPlanRepository
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.planUnits', 'planUnits');

    if (filters?.year) {
      query.andWhere('plan.year = :year', { year: filters.year });
    }
    if (filters?.status) {
      query.andWhere('plan.status = :status', { status: filters.status });
    }
    if (filters?.ownerTeam) {
      query.andWhere('plan.ownerTeam = :ownerTeam', {
        ownerTeam: filters.ownerTeam,
      });
    }

    query.orderBy('plan.year', 'DESC').addOrderBy('plan.createdAt', 'DESC');

    if (!user) {
      return query.getMany();
    }

    const fullUser = await this.userRepo.findOne({
      where: { id: user.userId },
      relations: ['role'],
    });

    if (!fullUser) {
      return query.getMany();
    }

    if (
      ScopeFilterService.isAdminRole(fullUser.role?.name, fullUser.jobTitle)
    ) {
      return query.getMany();
    }

    // Non-admin chỉ được xem kế hoạch thuộc TeamCode của mình
    query.andWhere('plan.ownerTeam = :userTeam', {
      userTeam: fullUser.teamCode,
    });
    return query.getMany();
  }

  async getRiskCoverage(year?: number) {
    const targetYear = year || new Date().getFullYear();

    // Fetch all RiskAssessments for this year that are Approved
    const allApproved = await this.auditPlanRepository.manager
      .getRepository(RiskAssessment)
      .find({
        where: { assessmentYear: targetYear, status: 'Approved' },
      });

    // Filter to high risk assessments
    const highRiskAssessments = allApproved.filter((a) =>
      isHighRiskAssessment(a),
    );

    // Fetch all audit plans for this year with normalized units
    const plans = await this.auditPlanRepository.find({
      where: { year: targetYear },
      relations: ['planUnits'],
    });

    // GIAS 9.5: Fetch active KRI alerts
    const activeKriAlerts = await this.auditPlanRepository.manager
      .getRepository(KriAlert)
      .find({
        where: { status: 'Active' },
      });

    // Collect all universeIds that are already selected in any plan
    const coveredUniverseIds = new Set<number>();
    const coveredNames = new Set<string>();
    for (const plan of plans) {
      if (plan.status === 'Rejected') continue;
      // Check normalized planUnits first (GIAS 9.4)
      if (
        plan.planUnits &&
        Array.isArray(plan.planUnits) &&
        plan.planUnits.length > 0
      ) {
        for (const unit of plan.planUnits) {
          if (unit.universeId) coveredUniverseIds.add(unit.universeId);
          if (unit.universeName) coveredNames.add(unit.universeName);
        }
      } else if (plan.selectedUnits && Array.isArray(plan.selectedUnits)) {
        for (const unit of plan.selectedUnits) {
          if (unit.universeId) coveredUniverseIds.add(unit.universeId);
          if (unit.name) coveredNames.add(unit.name);
        }
      }
    }

    const uncovered = highRiskAssessments.filter((ra) => {
      if (ra.auditUniverseId && coveredUniverseIds.has(ra.auditUniverseId))
        return false;
      return !coveredNames.has(ra.legacyUniverseName);
    });

    return {
      year: targetYear,
      totalHighRisk: highRiskAssessments.length,
      coveredCount: highRiskAssessments.length - uncovered.length,
      uncoveredCount: uncovered.length,
      uncoveredUnits: uncovered.map((ra) => {
        const kriCount = activeKriAlerts.filter(
          (k) =>
            k.auditUniverseId === ra.auditUniverseId ||
            (k.departmentName && k.departmentName === ra.legacyDepartmentName),
        ).length;
        return {
          id: ra.id,
          universeId: ra.auditUniverseId,
          legacyUniverseName: ra.legacyUniverseName,
          legacyDepartment: ra.legacyDepartmentName,
          riskLevel: ra.riskLevel,
          totalScore: ra.totalScore,
          residualRiskScore: ra.residualRiskScore,
          auditFrequency: ra.auditFrequency,
          activeKriCount: kriCount,
          hasKriWarning: kriCount > 0,
        };
      }),
    };
  }

  async getUniverseWithRisk(year: number) {
    const cacheKey = `audit_plans:universe_with_risk:${year}`;
    try {
      const cached = await this.cacheManager.get<any[]>(cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        return cached;
      }
    } catch (err) {
      console.warn('Cache manager lookup failed, reading from DB:', err);
    }

    const universes = await this.auditUniverseRepository.find({
      order: { name: 'ASC' },
    });

    const assessments = await this.auditPlanRepository.manager
      .getRepository(RiskAssessment)
      .find({
        where: { assessmentYear: year },
      });

    // GIAS 9.5: Active KRI alerts for coordination & reliance
    const activeKriList = await this.auditPlanRepository.manager
      .getRepository(KriAlert)
      .find({
        where: { status: 'Active' },
      });

    const result = universes.map((universe) => {
      const matched = assessments.find(
        (a) =>
          a.auditUniverseId === universe.id ||
          (a.legacyUniverseName && a.legacyUniverseName === universe.name) ||
          (universe.departmentCode &&
            a.legacyDepartmentName === universe.department),
      );

      const matchedKri = activeKriList.filter(
        (k) =>
          k.auditUniverseId === universe.id ||
          (k.departmentCode && k.departmentCode === universe.departmentCode) ||
          (k.departmentName && k.departmentName === universe.department),
      );
      const hasCriticalKri = matchedKri.some(
        (k) => k.severity === 'Critical' || k.severity === 'High',
      );

      return {
        ...universe,
        riskAssessmentId: matched ? matched.id : null,
        riskAssessmentStatus: matched ? matched.status : null,
        dynamicRiskRating: matched ? matched.riskLevel || null : null,
        residualRiskScore: matched ? matched.residualRiskScore : null,
        totalScore: matched ? matched.totalScore : null,
        hasRiskAssessment: !!matched,
        activeKriCount: matchedKri.length,
        hasCriticalKri,
        giasPriorityFlag: hasCriticalKri
          ? 'Ưu tiên kiểm toán (KRI vượt ngưỡng cảnh báo)'
          : null,
      };
    });

    try {
      // TTL: 5 minutes = 300,000 ms
      await this.cacheManager.set(cacheKey, result, 300000);
    } catch (err) {
      console.warn('Failed to save to Redis/cache:', err);
    }

    return result;
  }

  async invalidateUniverseRiskCache(year?: number) {
    try {
      if (year) {
        await this.cacheManager.del(`audit_plans:universe_with_risk:${year}`);
      } else {
        const currentYear = new Date().getFullYear();
        await Promise.all([
          this.cacheManager.del(
            `audit_plans:universe_with_risk:${currentYear}`,
          ),
          this.cacheManager.del(
            `audit_plans:universe_with_risk:${currentYear - 1}`,
          ),
          this.cacheManager.del(
            `audit_plans:universe_with_risk:${currentYear + 1}`,
          ),
        ]);
      }
    } catch (err) {
      console.warn('Failed to invalidate universe risk cache:', err);
    }
  }

  private async getCoverageWarningsForPlan(plan: AuditPlan) {
    const coverage = await this.getRiskCoverage(plan.year);
    const selectedIds = new Set(
      (plan.selectedUnits || []).map((unit) => unit.universeId).filter(Boolean),
    );
    const selectedNames = new Set(
      (plan.selectedUnits || []).map((unit) => unit.name).filter(Boolean),
    );
    return (coverage.uncoveredUnits || []).filter((unit) => {
      if (unit.universeId && selectedIds.has(unit.universeId)) return false;
      return !selectedNames.has(unit.legacyUniverseName);
    });
  }

  findOne(id: number) {
    return this.auditPlanRepository.findOneBy({ id });
  }

  async update(id: number, updateAuditPlanDto: UpdateAuditPlanDto) {
    await this.auditPlanRepository.update(id, updateAuditPlanDto);
    if (updateAuditPlanDto.selectedUnits) {
      await this.syncPlanUnits(id, updateAuditPlanDto.selectedUnits);
    }
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.auditPlanRepository.delete(id);
    return { success: true };
  }

  async submitPlan(id: number) {
    const plan = await this.findOne(id);
    if (!plan) {
      throw new NotFoundException(
        `Không tìm thấy kế hoạch kiểm toán với ID ${id}`,
      );
    }

    // Validate low risk justifications
    if (plan.selectedUnits && plan.selectedUnits.length > 0) {
      for (const unit of plan.selectedUnits) {
        const isLowRisk =
          typeof unit.riskLevel === 'string' &&
          (unit.riskLevel.toLowerCase() === 'low' ||
            unit.riskLevel.includes('Thấp') ||
            unit.riskLevel.includes('thấp') ||
            unit.riskLevel.toLowerCase().includes('hạng 1') ||
            unit.riskLevel.toLowerCase().includes('hạng 2'));

        if (
          isLowRisk &&
          (!unit.justification || unit.justification.trim() === '')
        ) {
          throw new BadRequestException(
            `Đối tượng kiểm toán rủi ro thấp "${unit.name}" cần phải được ghi chú nội dung tại sao chọn trước khi trình duyệt.`,
          );
        }
      }
    }

    plan.status = 'PendingApproval';
    const nextIter = (plan.approvalHistory?.length || 0) + 1;
    plan.approvalHistory = [
      ...(plan.approvalHistory || []),
      {
        iteration: nextIter,
        action: 'SUBMIT',
        actorId: 0,
        actorName: 'Người lập KH',
        role: 'Kiểm toán viên / Trưởng nhóm',
        timestamp: new Date().toISOString(),
        notes: 'Trình duyệt Kế hoạch Kiểm toán Năm',
      },
    ];

    const saved = await this.auditPlanRepository.save(plan);
    const coverageWarnings = await this.getCoverageWarningsForPlan(saved);
    return {
      ...saved,
      coverageWarnings,
      coverageWarningCount: coverageWarnings.length,
    };
  }

  // ==================== WORKFLOW PHÊ DUYỆT 2 NẤC KẾ HOẠCH NĂM ====================

  /**
   * Cấp 1 (L1): Trưởng phòng KTNB soát xét kế hoạch kiểm toán năm
   */
  async approveL1(
    id: number,
    reviewerId: number,
    reviewerName: string,
    notes?: string,
  ) {
    const plan = await this.findOne(id);
    if (!plan) {
      throw new NotFoundException(
        `Không tìm thấy kế hoạch kiểm toán với ID ${id}`,
      );
    }
    if (plan.status !== 'PendingApproval' && plan.status !== 'Draft') {
      throw new BadRequestException(
        'Chỉ có thể soát xét Cấp 1 đối với kế hoạch đang chờ duyệt',
      );
    }

    plan.status = 'Reviewed_L1';
    plan.reviewerL1Id = reviewerId;
    plan.reviewerL1Name = reviewerName;
    plan.reviewedL1At = new Date();
    plan.reviewerL1Notes = notes || 'Trưởng phòng đã soát xét Cấp 1';

    const nextIter = (plan.approvalHistory?.length || 0) + 1;
    plan.approvalHistory = [
      ...(plan.approvalHistory || []),
      {
        iteration: nextIter,
        action: 'APPROVE_L1',
        actorId: reviewerId,
        actorName: reviewerName,
        role: 'Trưởng phòng KTNB (L1)',
        timestamp: new Date().toISOString(),
        notes: plan.reviewerL1Notes,
      },
    ];

    return await this.auditPlanRepository.save(plan);
  }

  /**
   * Cấp 2 (L2): Trưởng Ban KTNB / Ban Kiểm soát phê duyệt chính thức kế hoạch năm
   * Tự động khởi tạo các cuộc kiểm toán (Audit Engagements)
   */
  async approveL2(
    id: number,
    approverId: number,
    approverName: string,
    notes?: string,
  ) {
    const plan = await this.findOne(id);
    if (!plan) {
      throw new NotFoundException(
        `Không tìm thấy kế hoạch kiểm toán với ID ${id}`,
      );
    }
    if (plan.status !== 'Reviewed_L1' && plan.status !== 'PendingApproval') {
      throw new BadRequestException(
        'Kế hoạch kiểm toán phải qua bước Soát xét Cấp 1 trước khi Ban Lãnh đạo duyệt Cấp 2',
      );
    }

    // Chặn tự duyệt (Self-Approval Prevention): Người soát xét L1 không được tự duyệt L2
    if (plan.reviewerL1Id && plan.reviewerL1Id === approverId) {
      throw new BadRequestException(
        'Theo nguyên tắc 4 mắt (Four-Eyes), người đã soát xét Cấp 1 không được tự phê duyệt ban hành Cấp 2',
      );
    }

    plan.status = 'Approved';
    plan.approvedBy = approverId;
    plan.approvedAt = new Date();
    plan.approverL2Id = approverId;
    plan.approverL2Name = approverName;
    plan.approvedL2At = new Date();
    plan.approverL2Notes = notes || 'Trưởng Ban KTNB/BKS đã phê duyệt ban hành';
    if (notes) {
      plan.approvalNotes = notes;
    }

    const nextIter = (plan.approvalHistory?.length || 0) + 1;
    plan.approvalHistory = [
      ...(plan.approvalHistory || []),
      {
        iteration: nextIter,
        action: 'APPROVE_FINAL',
        actorId: approverId,
        actorName: approverName,
        role: 'Trưởng Ban KTNB / BKS (L2)',
        timestamp: new Date().toISOString(),
        notes: plan.approverL2Notes,
      },
    ];

    const savedPlan = await this.auditPlanRepository.save(plan);

    // Tự động phân rã khởi tạo các cuộc kiểm toán (Audit Engagements)
    try {
      await this.decomposeIntoEngagements(plan.id);
    } catch (e) {
      console.warn('Auto decompose notice:', e.message);
    }

    await this.invalidateUniverseRiskCache(plan.year);
    return savedPlan;
  }

  /**
   * Tương thích ngược: approvePlan
   */
  async approvePlan(
    id: number,
    approverId: number,
    notes?: string,
    approverName?: string,
  ) {
    const plan = await this.findOne(id);
    if (!plan)
      throw new NotFoundException(
        `Không tìm thấy kế hoạch kiểm toán với ID ${id}`,
      );

    const name = approverName || 'Người phê duyệt';
    if (plan.status === 'PendingApproval') {
      return this.approveL1(id, approverId, name, notes);
    } else if (plan.status === 'Reviewed_L1') {
      return this.approveL2(id, approverId, name, notes);
    } else {
      return this.approveL2(id, approverId, name, notes);
    }
  }

  /**
   * Trưởng phòng / Trưởng ban yêu cầu chỉnh sửa (Rework) hoặc từ chối kế hoạch năm
   * Tăng revisionCount để theo dõi KPI chất lượng lập kế hoạch
   */
  async rejectPlan(
    id: number,
    approverId: number,
    notes?: string,
    approverName?: string,
  ) {
    const plan = await this.findOne(id);
    if (!plan) {
      throw new NotFoundException(
        `Không tìm thấy kế hoạch kiểm toán với ID ${id}`,
      );
    }

    plan.status = 'Draft'; // Đưa về Draft để KTV/Trưởng nhóm chỉnh sửa và trình lại
    plan.revisionCount = (plan.revisionCount || 0) + 1; // Ghi nhận 1 lần Rework tính KPI
    plan.approvalNotes =
      notes || 'Yêu cầu rà soát và chỉnh sửa lại Kế hoạch năm';

    const nextIter = (plan.approvalHistory?.length || 0) + 1;
    plan.approvalHistory = [
      ...(plan.approvalHistory || []),
      {
        iteration: nextIter,
        action: 'REWORK',
        actorId: approverId,
        actorName: approverName || 'Người soát xét',
        role: 'Trưởng phòng / Trưởng Ban KTNB',
        timestamp: new Date().toISOString(),
        notes: plan.approvalNotes,
      },
    ];

    return this.auditPlanRepository.save(plan);
  }

  async submitRevision(
    id: number,
    revisionDto: SubmitRevisionDto,
    userId: number,
    userName: string,
  ) {
    const plan = await this.findOne(id);
    if (!plan) {
      throw new NotFoundException(
        `Không tìm thấy kế hoạch kiểm toán với ID ${id}`,
      );
    }

    if (!plan.revisions) {
      plan.revisions = [];
    }

    const nextIndex = plan.revisions.length + 1;
    const changedUnits = revisionDto.changedUnits || [];

    // Ensure selectedUnits array is initialized
    if (!plan.selectedUnits) {
      plan.selectedUnits = [];
    }

    for (const change of changedUnits) {
      if (change.action === 'ADD') {
        // Add to selectedUnits if not exists
        const exists = plan.selectedUnits.find(
          (u) => u.universeId === change.universeId,
        );
        if (!exists) {
          plan.selectedUnits.push({
            universeId: change.universeId,
            name: change.name,
            riskLevel: 'Low', // fallback placeholder
            estDays: change.newValues?.estDays || 10,
            ktvCount: change.newValues?.ktvCount || 3,
            justification: change.reason || '',
          });
        }

        // Seed AuditEngagement if not exists
        const existingEngagement =
          await this.auditEngagementRepository.findOneBy({
            planId: plan.id,
            legacyAuditedDepartment: change.name,
          });

        if (!existingEngagement) {
          const engagement = this.auditEngagementRepository.create({
            name: `Kiểm toán ${change.name} năm ${plan.year}`,
            planId: plan.id,
            legacyPlanName: plan.name,
            startDate: `${plan.year}-01-15`,
            endDate: `${plan.year}-12-15`,
            status: 'Planning',
            engagementType: 'Planned',
            ownerTeam: plan.ownerTeam || 'PKT_DVKD',
            auditCategory: 'ChiNhanh',
            legacyAuditedDepartment: change.name,
            budgetDays: change.newValues?.estDays || 10,
            teamMembers: [],
          });
          await this.auditEngagementRepository.save(engagement);
        }

        // If added, mark standard priority in AuditUniverse (clearing prioritized status if it was prioritized)
        const universe = await this.auditUniverseRepository.findOneBy({
          id: change.universeId,
        });
        if (universe && universe.planningPriority === 'Prioritized') {
          universe.planningPriority = 'Standard';
          universe.priorityReason = null;
          await this.auditUniverseRepository.save(universe);
        }
      } else if (change.action === 'REMOVE') {
        // Remove from selectedUnits
        plan.selectedUnits = plan.selectedUnits.filter(
          (u) => u.universeId !== change.universeId,
        );

        // Find matching AuditEngagement
        const existingEngagement =
          await this.auditEngagementRepository.findOneBy({
            planId: plan.id,
            legacyAuditedDepartment: change.name,
          });

        if (existingEngagement) {
          existingEngagement.status = 'Cancelled';
          existingEngagement.unplannedReason = `[Kỳ review: ${revisionDto.reviewPeriod}] ${change.reason}`;
          await this.auditEngagementRepository.save(existingEngagement);
        }

        // If nextPeriodPriority = true, update AuditUniverse
        if (change.nextPeriodPriority) {
          const universe = await this.auditUniverseRepository.findOneBy({
            id: change.universeId,
          });
          if (universe) {
            universe.planningPriority = 'Prioritized';
            universe.priorityReason = `Hoãn từ kế hoạch năm ${plan.year} (${revisionDto.reviewPeriod}). Lý do: ${change.reason}`;
            await this.auditUniverseRepository.save(universe);
          }
        }
      } else if (change.action === 'UPDATE') {
        // Update selectedUnits
        plan.selectedUnits = plan.selectedUnits.map((u) => {
          if (u.universeId === change.universeId) {
            return {
              ...u,
              estDays: change.newValues?.estDays ?? u.estDays,
              ktvCount: change.newValues?.ktvCount ?? u.ktvCount,
              justification: change.reason || u.justification,
            };
          }
          return u;
        });

        // Update AuditEngagement
        const existingEngagement =
          await this.auditEngagementRepository.findOneBy({
            planId: plan.id,
            legacyAuditedDepartment: change.name,
          });

        if (existingEngagement && change.newValues?.estDays) {
          existingEngagement.budgetDays = change.newValues.estDays;
          await this.auditEngagementRepository.save(existingEngagement);
        }
      }
    }

    // Save revision log
    plan.revisions.push({
      revisionIndex: nextIndex,
      reviewPeriod: revisionDto.reviewPeriod,
      reviewedAt: new Date(),
      reviewedBy: userId,
      reviewerName: userName,
      notes: revisionDto.notes || '',
      changedUnits: changedUnits,
    });

    return this.auditPlanRepository.save(plan);
  }

  /**
   * Phân rã Kế hoạch năm thành danh sách các Đoàn kiểm toán (Audit Engagements) theo Tháng và Nhân sự
   */
  async decomposeIntoEngagements(planId: number, user?: any) {
    const plan = await this.auditPlanRepository.findOneBy({ id: planId });
    if (!plan)
      throw new NotFoundException(
        `Không tìm thấy kế hoạch kiểm toán #${planId}`,
      );
    if (plan.status !== 'Approved') {
      throw new BadRequestException(
        'Chỉ kế hoạch kiểm toán đã được phê duyệt mới có thể phân rã thành các đoàn kiểm toán.',
      );
    }

    const createdEngagements: AuditEngagement[] = [];
    const selectedUnits = plan.selectedUnits || [];

    for (const unit of selectedUnits) {
      // Kiểm tra xem đã tạo đoàn cho đơn vị này chưa
      const existing = await this.auditEngagementRepository.findOne({
        where: {
          planId: plan.id,
          sourceAuditUniverseId: unit.universeId || undefined,
        },
      });

      if (existing) continue;

      const monthStr = unit.scheduledMonth
        ? `Tháng ${unit.scheduledMonth.toString().padStart(2, '0')}/${plan.year}`
        : `Năm ${plan.year}`;
      const engagementName = `Kiểm toán ${unit.name} - ${monthStr}`;

      // Tính ngày bắt đầu và kết thúc theo tháng dự kiến
      let startDate = `${plan.year}-01-01`;
      let endDate = `${plan.year}-12-31`;
      if (unit.scheduledMonth) {
        const m = unit.scheduledMonth.toString().padStart(2, '0');
        startDate = `${plan.year}-${m}-01`;
        endDate = `${plan.year}-${m}-28`;
      }

      const engagement = this.auditEngagementRepository.create({
        name: engagementName,
        planId: plan.id,
        legacyPlanName: plan.name,
        sourceAuditUniverseId: unit.universeId,
        legacyAuditedDepartment: unit.name,
        branchName: unit.name,
        riskLevel: unit.riskLevel || 'Medium',
        status: 'Planning',
        proposalStatus: 'Draft',
        workspaceStatus: 'Open',
        startDate,
        endDate,
        budgetDays: unit.estDays || 15,
        ownerTeam: plan.ownerTeam || 'PKT_DVKD',
        leadAuditorId: unit.leadAuditorId,
        legacyLeadAuditor: unit.leadAuditorName,
        teamMembers: unit.assignedTeamMembers || [],
        scope: `Kiểm toán toàn diện hoạt động và kiểm soát nội bộ tại ${unit.name} theo kế hoạch năm ${plan.year}.`,
        objective:
          'Đánh giá tính tuân thủ quy trình, hiệu quả hệ thống kiểm soát nội bộ và quản trị rủi ro.',
      });

      const saved = await this.auditEngagementRepository.save(engagement);
      createdEngagements.push(saved);
    }

    return {
      success: true,
      message: `Đã phân rã và khởi tạo thành công ${createdEngagements.length} đoàn kiểm toán từ kế hoạch năm ${plan.year}.`,
      totalCreated: createdEngagements.length,
      engagements: createdEngagements,
    };
  }
}
