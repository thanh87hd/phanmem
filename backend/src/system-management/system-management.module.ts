import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FastifyMulterModule as MulterModule } from '../common/interceptors/fastify-file-interceptor';
import { memoryStorage } from '../common/interceptors/fastify-file-interceptor';
import { SystemManagementService } from './system-management.service';
import { SystemManagementController } from './system-management.controller';
import { AuditTrailModule } from '../audit-trail/audit-trail.module';
import { SecurityConfig } from './entities/security-config.entity';
import { SecurityConfigService } from './security-config.service';
import { SsoProvider } from './entities/sso-provider.entity';
import { IntegrationService } from './integration.service';
import { MasterDataChangeRequest } from './entities/master-data-change-request.entity';
import { MasterDataChangeService } from './master-data-change.service';
import { MasterDataChangeController } from './master-data-change.controller';
import { Department } from '../departments/entities/department.entity';
import { DepartmentHistory } from '../departments/entities/department-history.entity';
import { DefectCode } from '../ai/entities/defect-code.entity';
import { AuditUniverse } from '../audit-universe/entities/audit-universe.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SecurityConfig,
      SsoProvider,
      MasterDataChangeRequest,
      Department,
      DepartmentHistory,
      DefectCode,
      AuditUniverse,
      AuditFinding,
    ]),
    AuditTrailModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
    }),
  ],
  providers: [
    SystemManagementService,
    SecurityConfigService,
    IntegrationService,
    MasterDataChangeService,
  ],
  controllers: [SystemManagementController, MasterDataChangeController],
  exports: [
    SystemManagementService,
    SecurityConfigService,
    IntegrationService,
    MasterDataChangeService,
  ],
})
export class SystemManagementModule {}
