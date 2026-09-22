import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QualityReviewsController } from './quality-reviews.controller';
import { QualityReviewsService } from './quality-reviews.service';
import { QualityReview } from './entities/quality-review.entity';
import { QualityAssessment } from './entities/quality-assessment.entity';
import { ReviewAction } from './entities/review-action.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QualityReview,
      QualityAssessment,
      AuditEngagement,
      ReviewAction,
    ]),
  ],
  controllers: [QualityReviewsController],
  providers: [QualityReviewsService],
  exports: [QualityReviewsService],
})
export class QualityReviewsModule {}
