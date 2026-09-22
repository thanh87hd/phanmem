import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditFindingsService } from './audit-findings.service';
import { AuditFindingsController } from './audit-findings.controller';
import { AuditFinding } from './entities/audit-finding.entity';
import { AuditWorkstream } from '../audit-engagements/entities/audit-workstream.entity';
import { AuditSampleBatch } from './entities/audit-sample-batch.entity';
import { AuditSample } from './entities/audit-sample.entity';
import { AuditSamplesService } from './audit-samples.service';
import { AuditSamplesController } from './audit-samples.controller';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import { WorkflowsModule } from '../workflows/workflows.module';
import { CaslModule } from '../casl/casl.module';

import { AuditMinute } from './entities/audit-minute.entity';
import { AuditFindingPersonnel } from './entities/audit-finding-personnel.entity';

import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';
import { WorkingPaper } from '../working-papers/entities/working-paper.entity';

import { AuditMinutesService } from './audit-minutes.service';
import { AuditMinutesController } from './audit-minutes.controller';
import { AuditMinutesExportService } from './audit-minutes-export.service';
import { AuditFindingsStatisticsService } from './audit-findings-statistics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditFinding,
      AuditWorkstream,
      AuditSampleBatch,
      AuditSample,
      Recommendation,
      AuditMinute,
      AuditFindingPersonnel,
      AuditEngagement,
      WorkingPaper,
    ]),
    WorkflowsModule,
    CaslModule,
  ],
  controllers: [
    AuditFindingsController,
    AuditSamplesController,
    AuditMinutesController,
  ],
  providers: [
    AuditFindingsService,
    AuditFindingsStatisticsService,
    AuditSamplesService,
    AuditMinutesService,
    AuditMinutesExportService,
  ],
  exports: [
    AuditFindingsStatisticsService,
    AuditSamplesService,
    AuditMinutesService,
    AuditMinutesExportService,
  ],
})
export class AuditFindingsModule {}
