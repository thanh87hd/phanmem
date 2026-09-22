import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KriAlert } from './entities/kri-alert.entity';
import { AuditUniverse } from '../audit-universe/entities/audit-universe.entity';
import { KriAlertsService } from './kri-alerts.service';
import { KriAlertsController } from './kri-alerts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([KriAlert, AuditUniverse])],
  controllers: [KriAlertsController],
  providers: [KriAlertsService],
  exports: [KriAlertsService, TypeOrmModule.forFeature([KriAlert])],
})
export class RiskIndicatorsModule {}
