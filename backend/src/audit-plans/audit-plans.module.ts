import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditPlansService } from './audit-plans.service';
import { AuditPlansController } from './audit-plans.controller';
import { AuditPlan } from './entities/audit-plan.entity';
import { AuditPlanUnit } from './entities/audit-plan-unit.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';
import { AuditUniverse } from '../audit-universe/entities/audit-universe.entity';
import { User } from '../users/entities/user.entity';
import { RiskIndicatorsModule } from '../risk-indicators/risk-indicators.module';

@Module({
  imports: [
    RiskIndicatorsModule,
    TypeOrmModule.forFeature([
      AuditPlan,
      AuditPlanUnit,
      AuditEngagement,
      AuditUniverse,
      User,
    ]),
  ],
  controllers: [AuditPlansController],
  providers: [AuditPlansService],
  exports: [AuditPlansService, TypeOrmModule],
})
export class AuditPlansModule {}
