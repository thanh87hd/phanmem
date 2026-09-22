import {
  Injectable,
  OnModuleInit,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QualityReview } from './entities/quality-review.entity';
import { QualityAssessment } from './entities/quality-assessment.entity';
import { ReviewAction } from './entities/review-action.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';

@Injectable()
export class QualityReviewsService implements OnModuleInit {
  constructor(
    @InjectRepository(QualityReview)
    private repo: Repository<QualityReview>,
    @InjectRepository(QualityAssessment)
    private assessmentRepo: Repository<QualityAssessment>,
    @InjectRepository(AuditEngagement)
    private engagementRepo: Repository<AuditEngagement>,
    @InjectRepository(ReviewAction)
    private actionRepo: Repository<ReviewAction>,
  ) {}

  async onModuleInit() {
    // Không còn seed dữ liệu mock ở đây. Dữ liệu sẽ được tạo thực tế qua API.
  }

  // Working Paper Quality Reviews (Existing)
  create(createDto: any) {
    const entity = this.repo.create(createDto);
    return this.repo.save(entity);
  }

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findByWorkingPaper(workingPaperId: number) {
    return this.repo.findOne({ where: { workingPaperId } });
  }

  findOne(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  async update(id: number, updateDto: any) {
    await this.repo.update(id, updateDto);
    return this.repo.findOne({ where: { id } });
  }

  async transition(
    id: number,
    level: 'self' | 'supervisor' | 'independent',
    status: string,
    notes?: string,
    userId?: number,
    userName?: string,
  ) {
    const qr = await this.findOne(id);
    if (!qr) throw new NotFoundException('Quality Review not found');

    const now = new Date();

    if (level === 'self') {
      qr.selfReviewStatus = status;
      if (notes) qr.selfReviewNotes = notes;
      if (userId) qr.selfReviewerId = userId;
      qr.selfReviewedAt = now;
    } else if (level === 'supervisor') {
      // IIA GIAS 2024 Gate: Supervisor review requires Self Review to be completed
      if (qr.selfReviewStatus !== 'Completed') {
        throw new BadRequestException(
          'Tự soát xét (Self Review) phải hoàn thành (Completed) trước khi Người giám sát/Trưởng đoàn soát xét.',
        );
      }
      qr.supervisorReviewStatus = status;
      if (notes) qr.supervisorReviewNotes = notes;
      if (userId) qr.supervisorReviewerId = userId;
      qr.supervisorReviewedAt = now;
    } else if (level === 'independent') {
      // IIA GIAS 2024 Gate: Independent review requires Self Review completed AND Supervisor review approved
      if (qr.selfReviewStatus !== 'Completed') {
        throw new BadRequestException(
          'Tự soát xét (Self Review) phải hoàn thành (Completed) trước khi Soát xét độc lập.',
        );
      }
      if (qr.supervisorReviewStatus !== 'Approved') {
        throw new BadRequestException(
          'Soát xét của Người giám sát/Trưởng đoàn phải được phê duyệt (Approved) trước khi Soát xét độc lập.',
        );
      }
      qr.independentReviewStatus = status;
      if (notes) qr.independentReviewNotes = notes;
      if (userId) qr.independentReviewerId = userId;
      qr.independentReviewedAt = now;
    }

    if (qr.independentReviewStatus === 'Approved') {
      qr.overallStatus = 'Approved';
    } else if (
      qr.supervisorReviewStatus === 'Rejected' ||
      qr.independentReviewStatus === 'Rejected'
    ) {
      qr.overallStatus = 'Rejected';
    }

    // ponytail: audit trail — log every review action for IIA 2024 compliance
    const actionName =
      level === 'self'
        ? 'SelfReview'
        : `${level.charAt(0).toUpperCase() + level.slice(1)}${status}`;
    await this.actionRepo.save(
      this.actionRepo.create({
        entityType: 'WorkingPaper',
        entityId: qr.workingPaperId,
        action: actionName,
        userId,
        userName,
        notes,
      }),
    );

    return this.repo.save(qr);
  }

  findActionsByEntity(entityType: string, entityId: number) {
    return this.actionRepo.find({
      where: { entityType, entityId },
      order: { createdAt: 'ASC' },
    });
  }

  remove(id: number) {
    return this.repo.delete(id);
  }

  // Engagement Quality Assessments (New F16)
  calculateOverallScore(scores: {
    planning: number;
    execution: number;
    reporting: number;
    documentation: number;
  }) {
    const planning = scores.planning || 0;
    const execution = scores.execution || 0;
    const reporting = scores.reporting || 0;
    const documentation = scores.documentation || 0;
    const score =
      planning * 0.25 +
      execution * 0.35 +
      reporting * 0.25 +
      documentation * 0.15;
    return Math.round(score * 100) / 100;
  }

  getRatingFromScore(score: number) {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Needs Improvement';
    return 'Unsatisfactory';
  }

  async createAssessment(dto: any) {
    const score = this.calculateOverallScore(dto.criteriaScores);
    const rating = this.getRatingFromScore(score);
    const assessment = this.assessmentRepo.create({
      ...dto,
      overallScore: score,
      rating,
    });
    return this.assessmentRepo.save(assessment);
  }

  findAllAssessments() {
    return this.assessmentRepo.find({ order: { createdAt: 'DESC' } });
  }

  findOneAssessment(id: number) {
    return this.assessmentRepo.findOne({ where: { id } });
  }

  async deleteAssessment(id: number) {
    await this.assessmentRepo.delete(id);
    return { success: true };
  }

  async getOverallQualityStats() {
    const assessments = await this.assessmentRepo.find();
    if (assessments.length === 0) {
      return {
        averageScore: 0,
        totalAssessed: 0,
        ratingDistribution: {
          Excellent: 0,
          Good: 0,
          'Needs Improvement': 0,
          Unsatisfactory: 0,
        },
        criteriaAverages: {
          planning: 0,
          execution: 0,
          reporting: 0,
          documentation: 0,
        },
      };
    }

    const totalAssessed = assessments.length;
    let sumScore = 0;
    const ratingDistribution = {
      Excellent: 0,
      Good: 0,
      'Needs Improvement': 0,
      Unsatisfactory: 0,
    };
    const criteriaSums = {
      planning: 0,
      execution: 0,
      reporting: 0,
      documentation: 0,
    };

    for (const a of assessments) {
      sumScore += a.overallScore;

      const r = a.rating as keyof typeof ratingDistribution;
      if (ratingDistribution[r] !== undefined) {
        ratingDistribution[r]++;
      } else {
        ratingDistribution['Good']++;
      }

      if (a.criteriaScores) {
        criteriaSums.planning += a.criteriaScores.planning || 0;
        criteriaSums.execution += a.criteriaScores.execution || 0;
        criteriaSums.reporting += a.criteriaScores.reporting || 0;
        criteriaSums.documentation += a.criteriaScores.documentation || 0;
      }
    }

    return {
      averageScore: Math.round((sumScore / totalAssessed) * 100) / 100,
      totalAssessed,
      ratingDistribution,
      criteriaAverages: {
        planning:
          Math.round((criteriaSums.planning / totalAssessed) * 100) / 100,
        execution:
          Math.round((criteriaSums.execution / totalAssessed) * 100) / 100,
        reporting:
          Math.round((criteriaSums.reporting / totalAssessed) * 100) / 100,
        documentation:
          Math.round((criteriaSums.documentation / totalAssessed) * 100) / 100,
      },
    };
  }
}
