import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardConfigController } from './dashboard-config.controller';
import { DashboardConfigService } from './dashboard-config.service';
import { DashboardConfig } from './entities/dashboard-config.entity';
import { AuditPlan } from '../audit-plans/entities/audit-plan.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import { WorkingPaper } from '../working-papers/entities/working-paper.entity';
import { RiskAssessment } from '../risk-assessments/entities/risk-assessment.entity';
import { Department } from '../departments/entities/department.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditPlan,
      AuditEngagement,
      AuditFinding,
      Recommendation,
      WorkingPaper,
      RiskAssessment,
      Department,
      User,
      DashboardConfig,
    ]),
  ],
  controllers: [DashboardController, DashboardConfigController],
  providers: [DashboardService, DashboardConfigService],
})
export class DashboardModule {}
