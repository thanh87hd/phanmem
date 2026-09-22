import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditCommitteeController } from './audit-committee.controller';
import { AuditCommitteeService } from './audit-committee.service';
import { AuditCharterModule } from '../audit-charter/audit-charter.module';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { AuditUniverse } from '../audit-universe/entities/audit-universe.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';
import { AnnualControlAssessment } from './entities/annual-control-assessment.entity';
import { ExecutiveSession } from './entities/executive-session.entity';
import { ExternalAssuranceCoordination } from './entities/external-assurance-coordination.entity';

@Module({
  imports: [
    AuditCharterModule,
    TypeOrmModule.forFeature([
      AuditFinding,
      AuditUniverse,
      AuditEngagement,
      AnnualControlAssessment,
      ExecutiveSession,
      ExternalAssuranceCoordination,
    ]),
  ],
  controllers: [AuditCommitteeController],
  providers: [AuditCommitteeService],
  exports: [AuditCommitteeService],
})
export class AuditCommitteeModule {}
