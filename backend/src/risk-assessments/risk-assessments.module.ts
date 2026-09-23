import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FastifyMulterModule as MulterModule } from '../common/interceptors/fastify-file-interceptor';
import { RiskAssessmentsService } from './risk-assessments.service';
import { RiskAssessmentsController } from './risk-assessments.controller';
import { RiskWeightService } from './risk-weight.service';
import { RiskWeightController } from './risk-weight.controller';
import { RiskAssessment } from './entities/risk-assessment.entity';
import { RcsaAssessment } from './entities/rcsa-assessment.entity';
import { RiskIndicatorsModule } from '../risk-indicators/risk-indicators.module';
import { RiskProfile } from './entities/risk-profile.entity';
import { RiskWeight } from './entities/risk-weight.entity';
import { RiskAuditLog } from './entities/risk-audit-log.entity';
import { RiskApproval } from './entities/risk-approval.entity';
import { RiskSnapshot } from './entities/risk-snapshot.entity';
import { RiskProfileChangeRequest } from './entities/risk-profile-change-request.entity';
import { RiskAssessmentScore } from './entities/risk-assessment-score.entity';
import { RiskProfileHistory } from './entities/risk-profile-history.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { excelUploadOptions } from '../common/security/upload-options';
import { AuditEngagementsModule } from '../audit-engagements/audit-engagements.module';
import { RiskProfileService } from './risk-profile.service';
import { KriService } from './kri.service';
import { UnifiedRiskEngineService } from './unified-risk-engine.service';
import { RcsaService } from './rcsa.service';
import { RiskPlanningService } from './risk-planning.service';
import { RiskPlanningController } from './risk-planning.controller';
import { AuditUniverse } from '../audit-universe/entities/audit-universe.entity';
import { Department } from '../departments/entities/department.entity';
import { RiskControlMatrix } from '../risk-control-matrix/entities/risk-control-matrix.entity';
import { RiskRegister } from '../risk-register/entities/risk-register.entity';
import { AuditPlan } from '../audit-plans/entities/audit-plan.entity';
import { AuditPlanUnit } from '../audit-plans/entities/audit-plan-unit.entity';
import { ResourceDemand } from '../resource-capacity/entities/resource-demand.entity';
import { StaffRoster } from '../resource-capacity/entities/staff-roster.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { MonitoringAlert } from '../continuous-monitoring/entities/monitoring-alert.entity';

@Module({
  imports: [
    RiskIndicatorsModule,
    TypeOrmModule.forFeature([
      RiskAssessment,
      RiskAssessmentScore,
      RcsaAssessment,
      RiskProfile,
      RiskWeight,
      RiskAuditLog,
      RiskApproval,
      RiskSnapshot,
      RiskProfileChangeRequest,
      RiskProfileHistory,
      AuditUniverse,
      Department,
      RiskControlMatrix,
      RiskRegister,
      AuditPlan,
      AuditPlanUnit,
      ResourceDemand,
      StaffRoster,
      AuditFinding,
      MonitoringAlert,
    ]),
    MulterModule.register(excelUploadOptions),
    NotificationsModule,
    AuditEngagementsModule,
  ],
  controllers: [
    RiskAssessmentsController,
    RiskWeightController,
    RiskPlanningController,
  ],
  providers: [
    RiskAssessmentsService,
    RiskWeightService,
    UnifiedRiskEngineService,
    RiskProfileService,
    KriService,
    RcsaService,
    RiskPlanningService,
  ],
  exports: [
    RiskAssessmentsService,
    RiskWeightService,
    UnifiedRiskEngineService,
    RiskProfileService,
    KriService,
    RcsaService,
    RiskPlanningService,
  ],
})
export class RiskAssessmentsModule {}
