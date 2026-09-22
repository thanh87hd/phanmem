import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditReportsService } from './audit-reports.service';
import { AuditReportsController } from './audit-reports.controller';
import { AuditReport } from './entities/audit-report.entity';
import { DigitalSignature } from './entities/digital-signature.entity';
import { ReportDistribution } from './entities/report-distribution.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { AuditSample } from '../audit-findings/entities/audit-sample.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import { AuditTrailModule } from '../audit-trail/audit-trail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AiModule } from '../ai/ai.module';
import { UsersModule } from '../users/users.module';
import { CaslModule } from '../casl/casl.module';
import { BullModule } from '@nestjs/bullmq';
import { AuditReportsProcessor } from './audit-reports.processor';
import { AuditReportsExportService } from './audit-reports-export.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditReport,
      DigitalSignature,
      ReportDistribution,
      AuditFinding,
      Recommendation,
      AuditSample,
    ]),
    UsersModule,
    AuditTrailModule,
    NotificationsModule,
    AiModule,
    CaslModule,
    BullModule.registerQueue({
      name: 'reports',
    }),
  ],
  controllers: [AuditReportsController],
  providers: [
    AuditReportsService,
    AuditReportsExportService,
    AuditReportsProcessor,
  ],
  exports: [AuditReportsService, AuditReportsExportService],
})
export class AuditReportsModule {}
