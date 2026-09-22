import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditRating } from './entities/audit-rating.entity';

export interface RatingCalculationInput {
  residualRiskScore: number;
  controlEffectivenessScore: number;
  criticalIssuesCount: number;
  highIssuesCount: number;
  moderateIssuesCount?: number;
  lowIssuesCount?: number;
  issueSeverityScore?: number;
  coverageGapPct?: number;
  managementResponseScore?: number;
  scopeLimitation?: string;
}

export const RATING_TIERS = {
  1: 'Satisfactory',
  2: 'Generally Satisfactory',
  3: 'Needs Improvement',
  4: 'Unsatisfactory',
} as const;

export type RatingTierName = (typeof RATING_TIERS)[keyof typeof RATING_TIERS];

@Injectable()
export class AuditRatingService {
  constructor(
    @InjectRepository(AuditRating)
    private readonly ratingRepo: Repository<AuditRating>,
  ) {}

  computeRating(input: RatingCalculationInput) {
    const wRR = 0.3;
    const wCE = 0.25;
    const wIS = 0.25;
    const wCG = 0.1;
    const wMR = 0.1;

    const sRR = Math.min(
      4,
      Math.max(1, Number(input.residualRiskScore) || 2.0),
    );
    const sCE = Math.min(
      4,
      Math.max(1, Number(input.controlEffectivenessScore) || 2.0),
    );

    // Calculate Issue Severity Score if not provided
    let sIS = input.issueSeverityScore ? Number(input.issueSeverityScore) : 1.0;
    if (!input.issueSeverityScore) {
      if (input.criticalIssuesCount >= 2) sIS = 4.0;
      else if (input.criticalIssuesCount === 1) sIS = 3.5;
      else if (input.highIssuesCount >= 3) sIS = 3.0;
      else if (input.highIssuesCount >= 1) sIS = 2.5;
      else if ((input.moderateIssuesCount || 0) >= 3) sIS = 2.0;
      else sIS = 1.0;
    }

    // Coverage gap score
    const gapPct = Number(input.coverageGapPct) || 0;
    let sCG = 1.0;
    if (gapPct > 0.3) sCG = 4.0;
    else if (gapPct > 0.15) sCG = 3.0;
    else if (gapPct > 0.05) sCG = 2.0;

    const sMR = Math.min(
      4,
      Math.max(1, Number(input.managementResponseScore) || 1.5),
    );

    // Base weighted score
    const baseScore = Number(
      (sRR * wRR + sCE * wCE + sIS * wIS + sCG * wCG + sMR * wMR).toFixed(2),
    );

    // Initial tier
    let initialTier = 1;
    if (baseScore <= 1.75) initialTier = 1;
    else if (baseScore <= 2.5) initialTier = 2;
    else if (baseScore <= 3.25) initialTier = 3;
    else initialTier = 4;

    const calculatedRating = RATING_TIERS[initialTier as 1 | 2 | 3 | 4];

    // Evaluate Hard Decision Rules
    let decisionTier = initialTier;
    const triggeredRules: string[] = [];

    // Rule 1: Critical issues
    if (input.criticalIssuesCount >= 2) {
      if (decisionTier < 4) {
        decisionTier = 4;
        triggeredRules.push(
          'Quy tắc 1: Có >= 2 phát hiện Critical -> Bắt buộc xếp loại Unsatisfactory',
        );
      }
    } else if (input.criticalIssuesCount === 1) {
      if (decisionTier < 3) {
        decisionTier = 3;
        triggeredRules.push(
          'Quy tắc 1: Có 1 phát hiện Critical -> Tối thiểu xếp loại Needs Improvement',
        );
      }
    }

    // Rule 2: High issues
    if (input.highIssuesCount >= 3) {
      if (decisionTier < 3) {
        decisionTier = 3;
        triggeredRules.push(
          'Quy tắc 2: Có >= 3 phát hiện High -> Tối thiểu xếp loại Needs Improvement',
        );
      }
    }

    // Rule 3: Scope limitation
    if (input.scopeLimitation === 'Severe') {
      if (decisionTier < 4) {
        decisionTier = 4;
        triggeredRules.push(
          'Quy tắc 3: Giới hạn phạm vi nghiêm trọng -> Bắt buộc xếp loại Unsatisfactory',
        );
      }
    }

    // Rule 4: Control Ineffectiveness
    if (sCE >= 3.75) {
      if (decisionTier < 3) {
        decisionTier = 3;
        triggeredRules.push(
          'Quy tắc 4: Hiệu lực kiểm soát yếu kém toàn diện (>=3.75) -> Tối thiểu Needs Improvement',
        );
      }
    }

    // Rule 5: High coverage gap (>30%)
    if (gapPct > 0.3 && decisionTier < 4) {
      decisionTier = Math.min(4, decisionTier + 1);
      triggeredRules.push(
        'Quy tắc 5: Khoảng trống phạm vi kiểm toán > 30% -> Giáng 1 bậc xếp hạng',
      );
    }

    // Rule 6: Unacceptable management response
    if (sMR >= 3.5 && decisionTier < 4) {
      decisionTier = Math.min(4, decisionTier + 1);
      triggeredRules.push(
        'Quy tắc 6: Phản hồi của đơn vị không thỏa đáng (>=3.5) -> Giáng 1 bậc xếp hạng',
      );
    }

    const decisionRuleRating = RATING_TIERS[decisionTier as 1 | 2 | 3 | 4];
    const decisionRuleRationale =
      triggeredRules.length > 0
        ? triggeredRules.join('; ')
        : 'Không kích hoạt quy tắc cứng, điểm xếp hạng giữ nguyên theo điểm trọng số cơ sở.';

    return {
      baseWeightedScore: baseScore,
      issueSeverityScore: sIS,
      calculatedRating,
      decisionRuleRating,
      decisionRuleRationale,
      finalRating: decisionRuleRating,
    };
  }

  async findAll(query: {
    engagementId?: string;
    rating?: string;
    status?: string;
  }) {
    const qb = this.ratingRepo.createQueryBuilder('r').orderBy('r.id', 'DESC');

    if (query.engagementId) {
      qb.andWhere('r.engagementId = :engId', { engId: query.engagementId });
    }
    if (query.rating) {
      qb.andWhere('r.finalRating = :rating', { rating: query.rating });
    }
    if (query.status) {
      qb.andWhere('r.status = :status', { status: query.status });
    }

    return await qb.getMany();
  }

  async findOne(ratingCode: string): Promise<AuditRating> {
    const item = await this.ratingRepo.findOne({ where: { ratingCode } });
    if (!item) {
      throw new NotFoundException(`Audit rating ${ratingCode} not found`);
    }
    return item;
  }

  async findByEngagement(engagementId: string): Promise<AuditRating | null> {
    return await this.ratingRepo.findOne({ where: { engagementId } });
  }

  async calculateAndSave(dto: Partial<AuditRating>): Promise<AuditRating> {
    const calc = this.computeRating({
      residualRiskScore: dto.residualRiskScore || 2.0,
      controlEffectivenessScore: dto.controlEffectivenessScore || 2.0,
      criticalIssuesCount: dto.criticalIssuesCount || 0,
      highIssuesCount: dto.highIssuesCount || 0,
      moderateIssuesCount: dto.moderateIssuesCount || 0,
      lowIssuesCount: dto.lowIssuesCount || 0,
      issueSeverityScore: dto.issueSeverityScore,
      coverageGapPct: dto.coverageGapPct || 0,
      managementResponseScore: dto.managementResponseScore || 1.5,
      scopeLimitation: dto.scopeLimitation || 'None',
    });

    const ratingCode =
      dto.ratingCode || `RATE-${Date.now().toString().slice(-6)}`;

    const entity = this.ratingRepo.create({
      ...dto,
      ratingCode,
      baseWeightedScore: calc.baseWeightedScore,
      issueSeverityScore: calc.issueSeverityScore,
      calculatedRating: calc.calculatedRating,
      decisionRuleRating: calc.decisionRuleRating,
      decisionRuleRationale: calc.decisionRuleRationale,
      finalRating: dto.finalRating || calc.finalRating,
    });

    return await this.ratingRepo.save(entity);
  }

  async getSummaryStats() {
    const total = await this.ratingRepo.count();
    const satisfactory = await this.ratingRepo.count({
      where: { finalRating: 'Satisfactory' },
    });
    const generallySatisfactory = await this.ratingRepo.count({
      where: { finalRating: 'Generally Satisfactory' },
    });
    const needsImprovement = await this.ratingRepo.count({
      where: { finalRating: 'Needs Improvement' },
    });
    const unsatisfactory = await this.ratingRepo.count({
      where: { finalRating: 'Unsatisfactory' },
    });

    return {
      total,
      satisfactory,
      generallySatisfactory,
      needsImprovement,
      unsatisfactory,
    };
  }
}
