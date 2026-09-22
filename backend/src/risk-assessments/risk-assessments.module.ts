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
import { RiskProfileHistory } from './entities/risk-profile-history.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { excelUploadOptions } from '../common/security/upload-options';
import { AuditEngagementsModule } from '../audit-engagements/audit-engagements.module';
import { RiskProfileService } from './risk-profile.service';
import { KriService } from './kri.service';
import { UnifiedRiskEngineService } from './unified-risk-engine.service';
import { RcsaService } from './rcsa.service';

@Module({
  imports: [
    RiskIndicatorsModule,
    TypeOrmModule.forFeature([
      RiskAssessment,
      RcsaAssessment,
      RiskProfile,
      RiskWeight,
      RiskAuditLog,
      RiskApproval,
      RiskSnapshot,
      RiskProfileChangeRequest,
      RiskProfileHistory,
    ]),
    MulterModule.register(excelUploadOptions),
    NotificationsModule,
    AuditEngagementsModule,
  ],
  controllers: [RiskAssessmentsController, RiskWeightController],
  providers: [
    RiskAssessmentsService,
    RiskWeightService,
    UnifiedRiskEngineService,
    RiskProfileService,
    KriService,
    RcsaService,
  ],
  exports: [
    RiskAssessmentsService,
    RiskWeightService,
    UnifiedRiskEngineService,
    RiskProfileService,
    KriService,
    RcsaService,
  ],
})
export class RiskAssessmentsModule {}
