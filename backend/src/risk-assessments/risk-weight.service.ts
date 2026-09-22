import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiskWeight } from './entities/risk-weight.entity';
import { RiskAssessment } from './entities/risk-assessment.entity';
import { RiskAuditLog } from './entities/risk-audit-log.entity';
import { CreateRiskWeightDto } from './dto/create-risk-weight.dto';
import { UpdateRiskWeightDto } from './dto/update-risk-weight.dto';

@Injectable()
export class RiskWeightService {
  constructor(
    @InjectRepository(RiskWeight)
    private readonly weightRepo: Repository<RiskWeight>,
    @InjectRepository(RiskAssessment)
    private readonly assessmentRepo: Repository<RiskAssessment>,
    @InjectRepository(RiskAuditLog)
    private readonly auditLogRepo: Repository<RiskAuditLog>,
  ) {}

  // ==================== CRUD ====================

  async create(dto: CreateRiskWeightDto, userId?: number) {
    // Validate assessment exists
    const assessment = await this.assessmentRepo.findOneBy({
      id: dto.assessmentId,
    });
    if (!assessment) {
      throw new NotFoundException(
        `Không tìm thấy đánh giá rủi ro ID=${dto.assessmentId}`,
      );
    }

    // Check duplicate criteriaId within same assessment
    const existing = await this.weightRepo.findOne({
      where: { assessmentId: dto.assessmentId, criteriaId: dto.criteriaId },
    });
    if (existing) {
      throw new BadRequestException(
        `Tiêu chí "${dto.criteriaId}" đã tồn tại trong đánh giá ID=${dto.assessmentId}`,
      );
    }

    const weight = this.weightRepo.create({
      ...dto,
      createdById: userId,
    });
    const saved = await this.weightRepo.save(weight);

    // Recalculate total weight for the assessment
    await this.recalculateTotalWeight(dto.assessmentId);

    // Audit log
    await this.logAudit('risk_weight', saved.id, 'create', userId, {
      assessmentId: dto.assessmentId,
      criteriaId: dto.criteriaId,
      weight: dto.weight,
    });

    return saved;
  }

  async findAllByAssessment(assessmentId: number) {
    return this.weightRepo.find({
      where: { assessmentId },
      order: { criteriaId: 'ASC' },
      relations: ['createdBy'],
    });
  }

  async findOne(id: number) {
    const weight = await this.weightRepo.findOne({
      where: { id },
      relations: ['createdBy', 'assessment'],
    });
    if (!weight) {
      throw new NotFoundException(`Không tìm thấy trọng số ID=${id}`);
    }
    return weight;
  }

  async update(id: number, dto: UpdateRiskWeightDto, userId?: number) {
    const weight = await this.weightRepo.findOneBy({ id });
    if (!weight) {
      throw new NotFoundException(`Không tìm thấy trọng số ID=${id}`);
    }

    const beforeValues = {
      criteriaId: weight.criteriaId,
      weight: weight.weight,
      description: weight.description,
    };

    // If changing criteriaId, check uniqueness
    if (dto.criteriaId && dto.criteriaId !== weight.criteriaId) {
      const duplicate = await this.weightRepo.findOne({
        where: {
          assessmentId: weight.assessmentId,
          criteriaId: dto.criteriaId,
        },
      });
      if (duplicate) {
        throw new BadRequestException(
          `Tiêu chí "${dto.criteriaId}" đã tồn tại trong đánh giá ID=${weight.assessmentId}`,
        );
      }
    }

    await this.weightRepo.update(id, dto);
    const updated = await this.weightRepo.findOneBy({ id });
    if (!updated) {
      throw new NotFoundException(
        `Không tìm thấy trọng số ID=${id} sau khi cập nhật`,
      );
    }

    // Recalculate total weight
    await this.recalculateTotalWeight(weight.assessmentId);

    // Audit log
    await this.logAudit('risk_weight', id, 'update', userId, {
      assessmentId: weight.assessmentId,
      before: beforeValues,
      after: {
        criteriaId: updated.criteriaId,
        weight: updated.weight,
        description: updated.description,
      },
    });

    return updated;
  }

  async remove(id: number, userId?: number) {
    const weight = await this.weightRepo.findOneBy({ id });
    if (!weight) {
      throw new NotFoundException(`Không tìm thấy trọng số ID=${id}`);
    }

    const assessmentId = weight.assessmentId;
    await this.weightRepo.delete(id);

    // Recalculate total weight
    await this.recalculateTotalWeight(assessmentId);

    // Audit log
    await this.logAudit('risk_weight', id, 'delete', userId, {
      assessmentId,
      criteriaId: weight.criteriaId,
      weight: weight.weight,
    });

    return { success: true, deletedId: id };
  }

  // ==================== RECALCULATE TOTAL WEIGHT ====================

  /**
   * Tính tổng trọng số cho một RiskAssessment.
   * Tổng weight phải = 1.0 (100%). Nếu > 1.0 → trả warning.
   * Cập nhật cột totalWeight trong bảng risk_assessments.
   * Tự động tính lại totalScore = Σ(weight × score) nếu có criteriaScores.
   */
  async recalculateTotalWeight(assessmentId: number): Promise<{
    totalWeight: number;
    totalScore: number;
    warning?: string;
  }> {
    const weights = await this.weightRepo.find({
      where: { assessmentId },
    });

    const totalWeight = weights.reduce((sum, w) => sum + (w.weight || 0), 0);
    const roundedTotal = parseFloat(totalWeight.toFixed(4));

    // Load existing assessment
    const assessment = await this.assessmentRepo.findOneBy({
      id: assessmentId,
    });
    if (!assessment) {
      throw new NotFoundException(
        `Không tìm thấy đánh giá rủi ro ID=${assessmentId}`,
      );
    }

    // Recalculate totalScore from criteriaScores if available
    let newTotalScore = assessment.totalScore;
    if (
      assessment.criteriaScores &&
      Array.isArray(assessment.criteriaScores) &&
      assessment.criteriaScores.length > 0
    ) {
      // Build a weight map from RiskWeight records
      const weightMap: Record<string, number> = {};
      for (const w of weights) {
        weightMap[w.criteriaId] = w.weight;
      }

      // Recalculate: totalScore = Σ(weight × score)
      let calculatedScore = 0;
      for (const cs of assessment.criteriaScores) {
        const w =
          (cs.criteriaId !== undefined
            ? weightMap[cs.criteriaId]
            : undefined) ??
          cs.weight ??
          0;
        const score = cs.score ?? 0;
        calculatedScore += w * score;

        // Update weight in criteriaScores array to keep in sync
        cs.weight = w;
        cs.weightedScore = parseFloat((w * score).toFixed(2));
      }
      newTotalScore = parseFloat(calculatedScore.toFixed(2));
    }

    // Update assessment
    await this.assessmentRepo.update(assessmentId, {
      totalWeight: roundedTotal,
      totalScore: newTotalScore,
      inherentRiskScore: newTotalScore, // inherent = totalScore
      criteriaScores: assessment.criteriaScores,
    });

    const result: {
      totalWeight: number;
      totalScore: number;
      warning?: string;
    } = {
      totalWeight: roundedTotal,
      totalScore: newTotalScore,
    };

    if (roundedTotal > 1.0) {
      result.warning = `Tổng trọng số (${roundedTotal}) vượt quá 1.0 (100%). Vui lòng kiểm tra lại.`;
    } else if (roundedTotal < 1.0 && weights.length > 0) {
      result.warning = `Tổng trọng số (${roundedTotal}) chưa đủ 1.0 (100%). Còn thiếu ${parseFloat((1 - roundedTotal).toFixed(4))}.`;
    }

    return result;
  }

  // ==================== AUDIT LOG ====================

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
}
