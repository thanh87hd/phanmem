import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkingPapersService } from './working-papers.service';
import { WorkingPapersDataExchangeService } from './working-papers-data-exchange.service';
import { WorkingPapersController } from './working-papers.controller';
import { WorkingPaper } from './entities/working-paper.entity';
import { AuditWorkstream } from '../audit-engagements/entities/audit-workstream.entity';
import { AuditSampleBatch } from '../audit-findings/entities/audit-sample-batch.entity';
import { AuditSample } from '../audit-findings/entities/audit-sample.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { AuditFindingPersonnel } from '../audit-findings/entities/audit-finding-personnel.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import { AuditTrailModule } from '../audit-trail/audit-trail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { QualityReviewsModule } from '../quality-reviews/quality-reviews.module';
import { AuditFindingsModule } from '../audit-findings/audit-findings.module';
import { CaslModule } from '../casl/casl.module';
import { BullModule } from '@nestjs/bullmq';
import { WorkingPapersProcessor } from './working-papers.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkingPaper,
      AuditWorkstream,
      AuditSampleBatch,
      AuditSample,
      AuditFinding,
      AuditFindingPersonnel,
      Recommendation,
    ]),
    AuditTrailModule,
    NotificationsModule,
    QualityReviewsModule,
    CaslModule,
    AuditFindingsModule,
    BullModule.registerQueue({
      name: 'working-papers',
    }),
  ],
  controllers: [WorkingPapersController],
  providers: [
    WorkingPapersService,
    WorkingPapersDataExchangeService,
    WorkingPapersProcessor,
  ],
  exports: [WorkingPapersService, WorkingPapersDataExchangeService],
})
export class WorkingPapersModule {}
