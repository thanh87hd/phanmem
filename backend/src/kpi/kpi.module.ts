import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KpiController } from './kpi.controller';
import { KpiService } from './kpi.service';
import { AuditPlan } from '../audit-plans/entities/audit-plan.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import { AuditReport } from '../audit-reports/entities/audit-report.entity';
import { WorkingPaper } from '../working-papers/entities/working-paper.entity';
import { ComplianceStatus } from './entities/compliance-status.entity';

import { MasterDataChangeRequest } from '../system-management/entities/master-data-change-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditPlan,
      AuditEngagement,
      AuditFinding,
      Recommendation,
      AuditReport,
      WorkingPaper,
      ComplianceStatus,
      MasterDataChangeRequest,
    ]),
  ],
  controllers: [KpiController],
  providers: [KpiService],
})
export class KpiModule {}
