import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeederService } from './seeder.service';
import { SeederController } from './seeder.controller';
import { Department } from '../departments/entities/department.entity';
import { AuditUniverse } from '../audit-universe/entities/audit-universe.entity';
import { AuditPlan } from '../audit-plans/entities/audit-plan.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import { MonitoringAlert } from '../continuous-monitoring/entities/monitoring-alert.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { UserCompetency } from '../users/entities/user-competency.entity';
import { RiskCriterion } from '../risk-criteria/entities/risk-criterion.entity';
import { RiskAssessment } from '../risk-assessments/entities/risk-assessment.entity';
import { WorkingPaper } from '../working-papers/entities/working-paper.entity';
import { AuditSample } from '../audit-findings/entities/audit-sample.entity';
import { AuditSampleBatch } from '../audit-findings/entities/audit-sample-batch.entity';
import { AuditReport } from '../audit-reports/entities/audit-report.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Department,
      AuditUniverse,
      AuditPlan,
      AuditEngagement,
      AuditFinding,
      Recommendation,
      MonitoringAlert,
      User,
      Role,
      UserCompetency,
      RiskCriterion,
      RiskAssessment,
      WorkingPaper,
      AuditSample,
      AuditSampleBatch,
      AuditReport,
    ]),
  ],
  controllers: [SeederController],
  providers: [SeederService],
})
export class SeederModule {}
