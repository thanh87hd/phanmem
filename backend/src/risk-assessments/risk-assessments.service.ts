import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { CreateRiskAssessmentDto } from './dto/create-risk-assessment.dto';
import { UpdateRiskAssessmentDto } from './dto/update-risk-assessment.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { RiskAssessment } from './entities/risk-assessment.entity';
import { AuditUniverse } from '../audit-universe/entities/audit-universe.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/entities/user.entity';
import { AuditEngagementsService } from '../audit-engagements/audit-engagements.service';

import { RiskApproval } from './entities/risk-approval.entity';
import { RiskSnapshot } from './entities/risk-snapshot.entity';
import { RiskAuditLog } from './entities/risk-audit-log.entity';

import { UnifiedRiskEngineService } from './unified-risk-engine.service';
import {
  isHighRiskAssessment,
  classifyByAdjustedResidual,
  recommendAuditFrequency,
} from './helpers/risk-classification.helper';
import type { AuthUserContext } from './dto/risk-types';

@Injectable()
export class RiskAssessmentsService {
  private readonly logger = new Logger(RiskAssessmentsService.name);

  constructor(
    @InjectRepository(RiskAssessment)
    private readonly riskAssessmentRepository: Repository<RiskAssessment>,
    @InjectRepository(RiskApproval)
    private readonly riskApprovalRepo: Repository<RiskApproval>,
    @InjectRepository(RiskSnapshot)
    private readonly riskSnapshotRepo: Repository<RiskSnapshot>,
    @InjectRepository(RiskAuditLog)
    private readonly auditLogRepo: Repository<RiskAuditLog>,
    private readonly entityManager: EntityManager,
    private readonly notificationsService: NotificationsService,
    private readonly auditEngagementsService: AuditEngagementsService,
    private readonly unifiedRiskEngine: UnifiedRiskEngineService,
  ) {}

  // ==================== RISK VS DEFECT HEATMAP ====================
  async getRiskDefectHeatmap() {
    const universes = await this.entityManager
      .getRepository(AuditUniverse)
      .find();
    const findings = await this.entityManager.getRepository(AuditFinding).find({
      relations: ['internalDefectCodeEntity', 'engagement'],
    });

    const universeFindingStats: Record<
      number,
      { count: number; highRiskCount: number; fineTotal: number }
    > = {};

    findings.forEach((f) => {
      const uId =
        f.businessProcessId ||
        (f as any).auditUniverseId ||
        f.engagement?.planId;
      if (uId) {
        if (!universeFindingStats[uId]) {
          universeFindingStats[uId] = {
            count: 0,
            highRiskCount: 0,
            fineTotal: 0,
          };
        }
        universeFindingStats[uId].count += 1;
        if (
          f.riskLevel === 'High' ||
          f.internalDefectCodeEntity?.riskLevel === 3
        ) {
          universeFindingStats[uId].highRiskCount += 1;
        }
      }
    });

    return universes.map((u) => {
      const stats = universeFindingStats[u.id] || {
        count: 0,
        highRiskCount: 0,
        fineTotal: 0,
      };
      return {
        auditUniverseId: u.id,
        universeName: u.name,
        riskScore: u.riskScore || 2.5,
        defectScore:
          u.pastFindingsScore ||
          (stats.count > 5 ? 4.0 : stats.count > 0 ? 3.0 : 1.5),
        defectCount: stats.count,
        highRiskDefectCount: stats.highRiskCount,
        dynamicRiskRating:
          u.dynamicRiskRating || (u.riskScore >= 3.5 ? 'High' : 'Medium'),
      };
    });
  }

  // ==================== RISK ASSESSMENT CRUD ====================

  async create(
    createRiskAssessmentDto: CreateRiskAssessmentDto,
    user?: AuthUserContext,
  ) {
    if (createRiskAssessmentDto.auditUniverseId) {
      const universe = await this.entityManager
        .getRepository(AuditUniverse)
        .findOneBy({ id: createRiskAssessmentDto.auditUniverseId });
      if (universe) {
        if (!createRiskAssessmentDto.universeName) {
          createRiskAssessmentDto.universeName = universe.name;
        }
        if (!createRiskAssessmentDto.department) {
          createRiskAssessmentDto.department = universe.department;
        }
        if (!createRiskAssessmentDto.auditCategory) {
          createRiskAssessmentDto.auditCategory =
            universe.auditCategory || 'ChiNhanh';
        }
      }
    }

    // Use Unified Risk Engine (THUCTE) for scoring
    const engineInput = {
      inherentRiskScore:
        createRiskAssessmentDto.inherentRiskScore ??
        createRiskAssessmentDto.totalScore,
      controlEffectiveness:
        createRiskAssessmentDto.controlEffectiveness || 'Adequate',
      riskVelocity: createRiskAssessmentDto.riskVelocity || 'Stable',
      criteriaScores: (createRiskAssessmentDto as any).criteriaScores,
      impactScores: (createRiskAssessmentDto as any).impactScores,
      likelihoodScores: (createRiskAssessmentDto as any).likelihoodScores,
      designEffectiveness: (createRiskAssessmentDto as any).designEffectiveness,
      operatingEffectiveness: (createRiskAssessmentDto as any)
        .operatingEffectiveness,
      isRecurring: (createRiskAssessmentDto as any).isRecurring,
      isOverdueCritical: (createRiskAssessmentDto as any).isOverdueCritical,
      isEmergingRisk: (createRiskAssessmentDto as any).isEmergingRisk,
    };
    const engineResult = this.unifiedRiskEngine.calculate(engineInput);

    const { department, universeName, assessedBy, ...dtoWithoutRelations } =
      createRiskAssessmentDto;
    const assessment = this.riskAssessmentRepository.create({
      ...dtoWithoutRelations,
      legacyUniverseName: universeName,
      legacyDepartmentName: department,
      assessedById: user?.userId || user?.id,
      legacyAssessedByUserId: user?.userId || user?.id,
      legacyAssessedByName: user?.username,
      inherentRiskScore: engineResult.inherentRiskScore,
      controlEffectiveness: engineResult.controlEffectiveness,
      residualRiskScore: engineResult.residualRiskScore,
      adjustedResidualScore: engineResult.adjustedResidualScore,
      riskVelocity: engineInput.riskVelocity,
      auditFrequency:
        createRiskAssessmentDto.auditFrequency ?? engineResult.auditFrequency,
      status: 'Draft',
    });
    return this.riskAssessmentRepository.save(assessment);
  }

  async findAll(filters?: {
    year?: number;
    status?: string;
    riskLevel?: string;
    department?: string;
    auditUniverseId?: number;
    search?: string;
  }) {
    const qb = this.riskAssessmentRepository.createQueryBuilder('ra');

    if (filters?.year) {
      qb.andWhere('ra.assessmentYear = :year', { year: filters.year });
    }
    if (filters?.status) {
      qb.andWhere('ra.status = :status', { status: filters.status });
    }
    if (filters?.riskLevel) {
      qb.andWhere('ra.riskLevel LIKE :riskLevel', {
        riskLevel: `%${filters.riskLevel}%`,
      });
    }
    if (filters?.department) {
      qb.andWhere('ra.legacyDepartmentName LIKE :department', {
        department: `%${filters.department}%`,
      });
    }
    if (filters?.auditUniverseId) {
      qb.andWhere('ra.auditUniverseId = :auditUniverseId', {
        auditUniverseId: filters.auditUniverseId,
      });
    }
    if (filters?.search) {
      qb.andWhere(
        '(ra.legacyUniverseName ILIKE :search OR ra.legacyDepartmentName ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    qb.orderBy('ra.assessmentYear', 'DESC').addOrderBy('ra.totalScore', 'DESC');

    return qb.getMany();
  }

  findOne(id: number) {
    return this.riskAssessmentRepository.findOneBy({ id });
  }

  async update(
    id: number,
    updateRiskAssessmentDto: UpdateRiskAssessmentDto,
    user?: AuthUserContext,
  ) {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException('Không tìm thấy đánh giá rủi ro');
    }
    if (existing.status !== 'Draft' && existing.status !== 'Rejected') {
      throw new BadRequestException(
        'Chỉ có thể sửa đánh giá ở trạng thái Nháp hoặc Bị từ chối',
      );
    }

    const dto = updateRiskAssessmentDto as any;
    if (
      dto.inherentRiskScore !== undefined ||
      dto.controlEffectiveness !== undefined ||
      dto.totalScore !== undefined ||
      dto.impactScores !== undefined ||
      dto.likelihoodScores !== undefined
    ) {
      // Re-calculate via Unified Risk Engine
      const engineResult = this.unifiedRiskEngine.calculate({
        inherentRiskScore:
          dto.inherentRiskScore ?? dto.totalScore ?? existing.inherentRiskScore,
        controlEffectiveness:
          dto.controlEffectiveness ?? existing.controlEffectiveness,
        riskVelocity: dto.riskVelocity ?? existing.riskVelocity,
        criteriaScores: dto.criteriaScores,
        impactScores: dto.impactScores,
        likelihoodScores: dto.likelihoodScores,
        designEffectiveness:
          dto.designEffectiveness ?? existing.designEffectiveness,
        operatingEffectiveness:
          dto.operatingEffectiveness ?? existing.operatingEffectiveness,
        isRecurring: dto.isRecurring ?? existing.isRecurring,
        isOverdueCritical: dto.isOverdueCritical ?? existing.isOverdueCritical,
        isEmergingRisk: dto.isEmergingRisk ?? existing.isEmergingRisk,
      });
      dto.inherentRiskScore = engineResult.inherentRiskScore;
      dto.residualRiskScore = engineResult.residualRiskScore;
      dto.adjustedResidualScore = engineResult.adjustedResidualScore;
      dto.controlEffectiveness = engineResult.controlEffectiveness;
      dto.auditFrequency = engineResult.auditFrequency;
    }

    const { department, universeName, assessedBy, ...dtoWithoutRelations } =
      updateRiskAssessmentDto;
    await this.riskAssessmentRepository.update(id, {
      ...dtoWithoutRelations,
      legacyUniverseName: universeName,
      legacyDepartmentName: department,
    });
    return this.findOne(id);
  }

  async remove(id: number) {
    const existing = await this.findOne(id);
    if (existing && existing.status === 'Approved') {
      throw new BadRequestException('Không thể xóa đánh giá đã được phê duyệt');
    }
    await this.riskAssessmentRepository.delete(id);
    return { success: true };
  }

  // ==================== WORKFLOW PHÊ DUYỆT ====================

  async submitForReview(id: number) {
    const assessment = await this.findOne(id);
    if (!assessment)
      throw new NotFoundException('Không tìm thấy đánh giá rủi ro');
    if (assessment.status !== 'Draft' && assessment.status !== 'Rejected') {
      throw new BadRequestException(
        'Chỉ có thể gửi duyệt đánh giá ở trạng thái Nháp hoặc Bị từ chối',
      );
    }
    assessment.status = 'Submitted';
    assessment.submittedAt = new Date();
    const saved = await this.riskAssessmentRepository.save(assessment);
    const createdEngagement =
      await this.auditEngagementsService.createFromRiskAssessment(saved);

    try {
      const approvers = await this.entityManager
        .getRepository(User)
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.role', 'role')
        .where('role.name IN (:...roles)', {
          roles: ['Admin', 'Trưởng Ban KTNB'],
        })
        .getMany();

      const approverIds = approvers.map((u) => u.id);
      if (approverIds.length > 0) {
        await this.notificationsService.broadcast(approverIds, {
          type: 'info',
          title: 'Đánh giá rủi ro chờ duyệt 📋',
          message: `Đánh giá rủi ro quy trình "${assessment.legacyUniverseName}" đã được gửi duyệt.`,
          relatedEntity: 'RiskAssessment',
          relatedEntityId: assessment.id,
          link: '/risk-assessment',
        });
      }
    } catch (err) {
      this.logger.error('Error sending submit notification:', err);
    }

    return { ...saved, createdEngagement };
  }

  // ==================== WORKFLOW PHÊ DUYỆT 2 NẤC (FOUR-EYES PRINCIPLE) ====================

  async approveL1(
    id: number,
    approverId: number,
    approverName: string,
    notes?: string,
  ) {
    const assessment = await this.findOne(id);
    if (!assessment) {
      throw new NotFoundException('Không tìm thấy đánh giá rủi ro');
    }
    if (
      assessment.status !== 'Submitted' &&
      assessment.status !== 'Pending_L1'
    ) {
      throw new BadRequestException(
        'Chỉ có thể soát xét Cấp 1 đối với đánh giá đang ở trạng thái Chờ duyệt (Submitted)',
      );
    }

    const creatorId =
      assessment.assessedById || assessment.legacyAssessedByUserId;
    if (creatorId && approverId && creatorId === approverId) {
      throw new BadRequestException(
        'Theo nguyên tắc 4 mắt (Four-Eyes), người lập đánh giá không được tự soát xét/phê duyệt Cấp 1',
      );
    }

    const approval = this.riskApprovalRepo.create({
      assessmentId: id,
      approverId,
      level: 1,
      status: 'Approved',
      notes: notes || 'Đã soát xét Cấp 1',
    });
    await this.riskApprovalRepo.save(approval);

    assessment.status = 'Reviewed_L1';
    assessment.legacyReviewedByName = approverName;
    assessment.legacyReviewedByUserId = approverId;
    assessment.reviewedAt = new Date();
    assessment.reviewNotes = notes || 'Đã duyệt Cấp 1';
    const saved = await this.riskAssessmentRepository.save(assessment);

    await this.logAudit('risk_assessment', id, 'approve_l1', approverId, {
      approverName,
      notes,
    });

    try {
      const l2Approvers = await this.entityManager.getRepository(User).find({
        where: [
          { role: { name: 'trưởng ban ktnb' } as any },
          { role: { name: 'lãnh đạo ktnb' } as any },
          { role: { name: 'admin' } as any },
        ],
      });
      const l2Ids = l2Approvers
        .map((u) => u.id)
        .filter((uid) => uid !== approverId);
      if (l2Ids.length > 0) {
        await this.notificationsService.broadcast(l2Ids, {
          type: 'info',
          title: 'Đánh giá rủi ro chờ duyệt Cấp 2 (L2) 📋',
          message: `Đánh giá rủi ro "${assessment.legacyUniverseName}" đã được ${approverName} duyệt Cấp 1, chờ Lãnh đạo Khối phê duyệt ban hành.`,
          relatedEntity: 'RiskAssessment',
          relatedEntityId: assessment.id,
          link: '/risk-assessment',
        });
      }
    } catch (err) {
      this.logger.error('Error sending L1 approve notification:', err);
    }

    return saved;
  }

  async approveL2(
    id: number,
    approverId: number,
    approverName: string,
    notes?: string,
  ) {
    const assessment = await this.findOne(id);
    if (!assessment) {
      throw new NotFoundException('Không tìm thấy đánh giá rủi ro');
    }
    if (
      assessment.status !== 'Reviewed_L1' &&
      assessment.status !== 'Submitted'
    ) {
      throw new BadRequestException(
        'Đánh giá rủi ro phải qua bước Soát xét Cấp 1 (Reviewed_L1) trước khi Lãnh đạo Khối duyệt Cấp 2',
      );
    }

    const creatorId =
      assessment.assessedById || assessment.legacyAssessedByUserId;
    if (creatorId && approverId && creatorId === approverId) {
      throw new BadRequestException(
        'Theo nguyên tắc 4 mắt (Four-Eyes), người lập đánh giá không được tự phê duyệt ban hành Cấp 2',
      );
    }

    const approval = this.riskApprovalRepo.create({
      assessmentId: id,
      approverId,
      level: 2,
      status: 'Approved',
      notes: notes || 'Đã phê duyệt Cấp 2 (Ban hành)',
    });
    await this.riskApprovalRepo.save(approval);

    assessment.status = 'Approved';
    assessment.reviewedById = approverId;
    assessment.legacyReviewedByName = approverName;
    assessment.legacyReviewedByUserId = approverId;
    assessment.reviewedAt = new Date();
    assessment.reviewNotes = notes || 'Đã phê duyệt ban hành Cấp 2';
    const saved = await this.riskAssessmentRepository.save(assessment);

    try {
      const fullAssessment = await this.riskAssessmentRepository.findOne({
        where: { id },
        relations: ['weights', 'auditUniverse', 'department'],
      });
      const snapshot = this.riskSnapshotRepo.create({
        assessmentId: id,
        data: fullAssessment,
        createdById: approverId,
      });
      await this.riskSnapshotRepo.save(snapshot);
    } catch (err) {
      this.logger.error('Error saving risk snapshot upon L2 approval:', err);
    }

    await this.logAudit('risk_assessment', id, 'approve_l2', approverId, {
      approverName,
      notes,
    });

    const targetUserId =
      assessment.assessedById || assessment.legacyAssessedByUserId;
    if (targetUserId) {
      try {
        await this.notificationsService.create({
          type: 'success',
          title: 'Đánh giá rủi ro đã được ban hành chính thức ✅',
          message: `Đánh giá rủi ro quy trình "${assessment.legacyUniverseName}" đã được ${approverName} phê duyệt Cấp 2 hoàn tất.`,
          recipientId: targetUserId,
          relatedEntity: 'RiskAssessment',
          relatedEntityId: assessment.id,
          link: '/risk-assessment',
        });
      } catch (err) {
        this.logger.error('Error sending L2 approve notification:', err);
      }
    }

    return saved;
  }

  async approveAssessment(
    id: number,
    legacyReviewedBy: number,
    legacyReviewedByName: string,
    reviewNotes?: string,
  ) {
    const assessment = await this.findOne(id);
    if (!assessment)
      throw new NotFoundException('Không tìm thấy đánh giá rủi ro');

    if (assessment.status === 'Submitted') {
      return this.approveL1(
        id,
        legacyReviewedBy,
        legacyReviewedByName,
        reviewNotes,
      );
    } else if (assessment.status === 'Reviewed_L1') {
      return this.approveL2(
        id,
        legacyReviewedBy,
        legacyReviewedByName,
        reviewNotes,
      );
    } else {
      throw new BadRequestException(
        `Không thể phê duyệt đánh giá ở trạng thái "${assessment.status}"`,
      );
    }
  }

  async rejectAssessment(
    id: number,
    legacyReviewedBy: number,
    legacyReviewedByName: string,
    reviewNotes: string,
    level: number = 1,
  ) {
    const assessment = await this.findOne(id);
    if (!assessment)
      throw new NotFoundException('Không tìm thấy đánh giá rủi ro');
    if (
      assessment.status !== 'Submitted' &&
      assessment.status !== 'Reviewed_L1'
    ) {
      throw new BadRequestException(
        'Chỉ có thể từ chối đánh giá đang chờ duyệt',
      );
    }
    if (!reviewNotes) {
      throw new BadRequestException('Vui lòng cung cấp lý do từ chối');
    }

    const approval = this.riskApprovalRepo.create({
      assessmentId: id,
      approverId: legacyReviewedBy,
      level,
      status: 'Rejected',
      notes: reviewNotes,
    });
    await this.riskApprovalRepo.save(approval);

    assessment.status = 'Rejected';
    assessment.legacyReviewedByName = legacyReviewedByName;
    assessment.legacyReviewedByUserId = legacyReviewedBy;
    assessment.reviewedAt = new Date();
    assessment.reviewNotes = reviewNotes;
    const saved = await this.riskAssessmentRepository.save(assessment);

    await this.logAudit(
      'risk_assessment',
      id,
      `reject_l${level}`,
      legacyReviewedBy,
      {
        approverName: legacyReviewedByName,
        reviewNotes,
      },
    );

    const targetUserId =
      assessment.assessedById || assessment.legacyAssessedByUserId;
    if (targetUserId) {
      try {
        await this.notificationsService.create({
          type: 'warning',
          title: `Đánh giá rủi ro bị từ chối ở Cấp ${level} ❌`,
          message: `Đánh giá rủi ro quy trình "${assessment.legacyUniverseName}" bị từ chối bởi ${legacyReviewedByName}. Lý do: ${reviewNotes}`,
          recipientId: targetUserId,
          relatedEntity: 'RiskAssessment',
          relatedEntityId: assessment.id,
          link: '/risk-assessment',
        });
      } catch (err) {
        this.logger.error('Error sending reject notification:', err);
      }
    }

    return saved;
  }

  private async logAudit(
    entity: string,
    entityId: number,
    action: string,
    performedById?: number,
    metadata?: any,
  ) {
    try {
      const log = this.auditLogRepo.create({
        entity,
        entityId,
        action,
        performedById,
        metadata,
      });
      await this.auditLogRepo.save(log);
    } catch {
      // Silently fail - audit log should not block operations
    }
  }

  // ==================== LỊCH SỬ & SO SÁNH ====================

  async getAssessmentHistory(auditUniverseId: number) {
    return this.riskAssessmentRepository.find({
      where: { auditUniverseId },
      order: { assessmentYear: 'DESC', createdAt: 'DESC' },
    });
  }

  async getAssessmentComparison(year1: number, year2: number) {
    const [assessments1, assessments2] = await Promise.all([
      this.riskAssessmentRepository.find({
        where: { assessmentYear: year1, status: 'Approved' },
      }),
      this.riskAssessmentRepository.find({
        where: { assessmentYear: year2, status: 'Approved' },
      }),
    ]);

    const map1: Record<string, RiskAssessment> = {};
    const map2: Record<string, RiskAssessment> = {};
    for (const a of assessments1) map1[a.legacyUniverseName] = a;
    for (const a of assessments2) map2[a.legacyUniverseName] = a;

    const allNames = new Set([...Object.keys(map1), ...Object.keys(map2)]);
    const comparisons: any[] = [];

    for (const name of allNames) {
      const a1 = map1[name];
      const a2 = map2[name];
      comparisons.push({
        legacyUniverseName: name,
        legacyDepartmentName:
          a2?.legacyDepartmentName || a1?.legacyDepartmentName || '',
        year1Score: a1?.totalScore || null,
        year1Level: a1?.riskLevel || null,
        year2Score: a2?.totalScore || null,
        year2Level: a2?.riskLevel || null,
        year1ResidualRiskScore: a1?.residualRiskScore ?? null,
        year2ResidualRiskScore: a2?.residualRiskScore ?? null,
        scoreDelta:
          a1 && a2
            ? parseFloat((a2.totalScore - a1.totalScore).toFixed(2))
            : null,
        trend:
          a1 && a2
            ? a2.totalScore > a1.totalScore
              ? 'increased'
              : a2.totalScore < a1.totalScore
                ? 'decreased'
                : 'stable'
            : 'new',
      });
    }

    return {
      year1,
      year2,
      totalYear1: assessments1.length,
      totalYear2: assessments2.length,
      comparisons: comparisons.sort(
        (a, b) => (a.year2Score || 0) - (b.year2Score || 0),
      ),
    };
  }

  // ==================== THỐNG KÊ TỔNG HỢP ====================

  async getSummaryStats(year?: number) {
    const targetYear = year || new Date().getFullYear();
    const assessments = await this.riskAssessmentRepository.find({
      where: { assessmentYear: targetYear },
    });

    const total = assessments.length;
    const approved = assessments.filter((a) => a.status === 'Approved').length;
    const submitted = assessments.filter(
      (a) => a.status === 'Submitted',
    ).length;
    const draft = assessments.filter((a) => a.status === 'Draft').length;
    const rejected = assessments.filter((a) => a.status === 'Rejected').length;

    const byRiskLevel: Record<string, number> = {};
    for (const a of assessments) {
      byRiskLevel[a.riskLevel] = (byRiskLevel[a.riskLevel] || 0) + 1;
    }

    const avgScore =
      total > 0
        ? parseFloat(
            (assessments.reduce((s, a) => s + a.totalScore, 0) / total).toFixed(
              2,
            ),
          )
        : 0;

    const highRisk = assessments
      .filter(
        (a) =>
          a.riskLevel.includes('Hạng 4') ||
          a.riskLevel.includes('Hạng 5') ||
          a.riskLevel === 'High' ||
          a.riskLevel === 'Critical',
      )
      .sort((a, b) => a.totalScore - b.totalScore)
      .slice(0, 5);

    const pendingReview = assessments.filter((a) => a.status === 'Submitted');

    return {
      year: targetYear,
      total,
      approved,
      submitted,
      draft,
      rejected,
      avgScore,
      byRiskLevel,
      highRisk,
      pendingReview,
    };
  }

  // ==================== GROUPED ASSESSMENTS (IIA 2024) ====================

  async getGroupedAssessments(year?: number) {
    const targetYear = year || new Date().getFullYear();
    const assessments = await this.riskAssessmentRepository.find({
      where: { assessmentYear: targetYear },
    });

    const CATEGORY_META: Record<
      string,
      { label: string; icon: string; description: string }
    > = {
      HoiSo: {
        label: 'Hội sở',
        icon: '🏢',
        description: 'Kiểm toán các đơn vị, phòng ban tại Hội sở chính',
      },
      ChiNhanh: {
        label: 'Chi nhánh',
        icon: '🏦',
        description: 'Kiểm toán các chi nhánh trực thuộc',
      },
      PGD: {
        label: 'Phòng giao dịch',
        icon: '📍',
        description: 'Kiểm toán các phòng giao dịch trực thuộc chi nhánh',
      },
      HeThong: {
        label: 'Hệ thống CNTT',
        icon: '💻',
        description: 'Kiểm toán hệ thống công nghệ thông tin, an ninh mạng',
      },
      ChuyenDe: {
        label: 'Nghiệp vụ',
        icon: '📋',
        description: 'Kiểm toán mảng nghiệp vụ xuyên suốt',
      },
    };

    const groups: Record<string, any> = {};
    for (const cat of Object.keys(CATEGORY_META)) {
      groups[cat] = {
        category: cat,
        ...CATEGORY_META[cat],
        total: 0,
        approved: 0,
        submitted: 0,
        draft: 0,
        rejected: 0,
        avgTotalScore: 0,
        avgResidualRiskScore: 0,
        riskDistribution: { hang1: 0, hang2: 0, hang3: 0, hang4: 0, hang5: 0 },
        highRiskCount: 0,
        auditFrequencyBreakdown: {
          Annual: 0,
          Biennial: 0,
          Triennial: 0,
          AdHoc: 0,
        },
        assessments: [] as any[],
      };
    }

    for (const a of assessments) {
      const cat = a.auditCategory || 'ChiNhanh';
      if (!groups[cat]) {
        groups[cat] = {
          category: cat,
          label: cat,
          icon: '📁',
          description: '',
          total: 0,
          approved: 0,
          submitted: 0,
          draft: 0,
          rejected: 0,
          avgTotalScore: 0,
          avgResidualRiskScore: 0,
          riskDistribution: {
            hang1: 0,
            hang2: 0,
            hang3: 0,
            hang4: 0,
            hang5: 0,
          },
          highRiskCount: 0,
          auditFrequencyBreakdown: {
            Annual: 0,
            Biennial: 0,
            Triennial: 0,
            AdHoc: 0,
          },
          assessments: [],
        };
      }

      const g = groups[cat];
      g.total++;
      if (a.status === 'Approved') g.approved++;
      else if (a.status === 'Submitted') g.submitted++;
      else if (a.status === 'Draft') g.draft++;
      else if (a.status === 'Rejected') g.rejected++;

      if (a.riskLevel.includes('Hạng 1')) g.riskDistribution.hang1++;
      else if (a.riskLevel.includes('Hạng 2')) g.riskDistribution.hang2++;
      else if (a.riskLevel.includes('Hạng 3')) g.riskDistribution.hang3++;
      else if (a.riskLevel.includes('Hạng 4')) {
        g.riskDistribution.hang4++;
        g.highRiskCount++;
      } else if (a.riskLevel.includes('Hạng 5')) {
        g.riskDistribution.hang5++;
        g.highRiskCount++;
      }

      const freq = a.auditFrequency || 'Annual';
      if (g.auditFrequencyBreakdown[freq] !== undefined)
        g.auditFrequencyBreakdown[freq]++;

      g.assessments.push(a);
    }

    for (const cat of Object.keys(groups)) {
      const g = groups[cat];
      if (g.total > 0) {
        g.avgTotalScore = parseFloat(
          (
            g.assessments.reduce(
              (s: number, a: any) => s + (a.totalScore || 0),
              0,
            ) / g.total
          ).toFixed(2),
        );
        g.avgResidualRiskScore = parseFloat(
          (
            g.assessments.reduce(
              (s: number, a: any) => s + (a.residualRiskScore || 0),
              0,
            ) / g.total
          ).toFixed(2),
        );
      }
      delete g.assessments;
    }

    return {
      year: targetYear,
      totalAssessments: assessments.length,
      groups: Object.values(groups),
    };
  }

  async getGroupSummary(category: string, year?: number) {
    const targetYear = year || new Date().getFullYear();
    const qb = this.riskAssessmentRepository
      .createQueryBuilder('ra')
      .where('ra.assessmentYear = :year', { year: targetYear })
      .andWhere('ra.auditCategory = :category', { category })
      .orderBy('ra.residualRiskScore', 'DESC');

    const assessments = await qb.getMany();
    const total = assessments.length;

    return {
      category,
      year: targetYear,
      total,
      approved: assessments.filter((a) => a.status === 'Approved').length,
      submitted: assessments.filter((a) => a.status === 'Submitted').length,
      draft: assessments.filter((a) => a.status === 'Draft').length,
      rejected: assessments.filter((a) => a.status === 'Rejected').length,
      avgTotalScore:
        total > 0
          ? parseFloat(
              (
                assessments.reduce((s, a) => s + a.totalScore, 0) / total
              ).toFixed(2),
            )
          : 0,
      avgInherentRisk:
        total > 0
          ? parseFloat(
              (
                assessments.reduce(
                  (s, a) => s + (a.inherentRiskScore || 0),
                  0,
                ) / total
              ).toFixed(2),
            )
          : 0,
      avgResidualRisk:
        total > 0
          ? parseFloat(
              (
                assessments.reduce(
                  (s, a) => s + (a.residualRiskScore || 0),
                  0,
                ) / total
              ).toFixed(2),
            )
          : 0,
      controlEffectivenessBreakdown: {
        Strong: assessments.filter((a) => a.controlEffectiveness === 'Strong')
          .length,
        Adequate: assessments.filter(
          (a) => a.controlEffectiveness === 'Adequate',
        ).length,
        Weak: assessments.filter((a) => a.controlEffectiveness === 'Weak')
          .length,
        Ineffective: assessments.filter(
          (a) => a.controlEffectiveness === 'Ineffective',
        ).length,
      },
      riskVelocityBreakdown: {
        Increasing: assessments.filter((a) => a.riskVelocity === 'Increasing')
          .length,
        Stable: assessments.filter((a) => a.riskVelocity === 'Stable').length,
        Decreasing: assessments.filter((a) => a.riskVelocity === 'Decreasing')
          .length,
      },
      assessments,
    };
  }

  async getAuditFrequencyRecommendation(year?: number) {
    const targetYear = year || new Date().getFullYear();
    const assessments = await this.riskAssessmentRepository.find({
      where: { assessmentYear: targetYear, status: 'Approved' },
      order: { residualRiskScore: 'DESC' },
    });

    return assessments.map((a) => {
      const classification = classifyByAdjustedResidual(
        a.adjustedResidualScore ?? a.residualRiskScore ?? 0,
      );
      const freq = recommendAuditFrequency(classification.riskLevel);
      return {
        id: a.id,
        legacyUniverseName: a.legacyUniverseName,
        legacyDepartmentName: a.legacyDepartmentName,
        auditCategory: a.auditCategory,
        totalScore: a.totalScore,
        inherentRiskScore: a.inherentRiskScore,
        controlEffectiveness: a.controlEffectiveness,
        residualRiskScore: a.residualRiskScore,
        riskVelocity: a.riskVelocity,
        riskLevel: a.riskLevel,
        currentAuditFrequency: a.auditFrequency,
        recommendedAuditFrequency: freq.auditFrequency,
        lastAuditDate: a.lastAuditDate,
      };
    });
  }
}
