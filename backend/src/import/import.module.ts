import { Module } from '@nestjs/common';
import { ImportService } from './import.service';
import { ImportController } from './import.controller';
import { UsersModule } from '../users/users.module';
import { DepartmentsModule } from '../departments/departments.module';
import { AuditUniverseModule } from '../audit-universe/audit-universe.module';
import { RiskCriteriaModule } from '../risk-criteria/risk-criteria.module';
import { RiskAssessmentsModule } from '../risk-assessments/risk-assessments.module';
import { RiskControlMatrixModule } from '../risk-control-matrix/risk-control-matrix.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { AuditTrailModule } from '../audit-trail/audit-trail.module';
import { AuditPlansModule } from '../audit-plans/audit-plans.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditPlan } from '../audit-plans/entities/audit-plan.entity';
import { AuditUniverse } from '../audit-universe/entities/audit-universe.entity';
import { User } from '../users/entities/user.entity';
import { ContinuousAuditRule } from '../continuous-monitoring/entities/continuous-audit-rule.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditPlan,
      AuditUniverse,
      User,
      ContinuousAuditRule,
    ]),
    UsersModule,
    DepartmentsModule,
    AuditUniverseModule,
    RiskCriteriaModule,
    RiskAssessmentsModule,
    RiskControlMatrixModule,
    TransactionsModule,
    AuditTrailModule,
    AuditPlansModule,
  ],
  controllers: [ImportController],
  providers: [ImportService],
})
export class ImportModule {}
