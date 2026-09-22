import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsController } from './recommendations.controller';
import { Recommendation } from './entities/recommendation.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { AuditTrailModule } from '../audit-trail/audit-trail.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recommendation, AuditFinding]),
    AuditTrailModule,
    NotificationsModule,
  ],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
