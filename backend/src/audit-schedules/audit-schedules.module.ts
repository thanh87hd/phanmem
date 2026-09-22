import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditSchedule } from './entities/audit-schedule.entity';
import { AuditSchedulesService } from './audit-schedules.service';
import { AuditSchedulesController } from './audit-schedules.controller';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditSchedule, User])],
  controllers: [AuditSchedulesController],
  providers: [AuditSchedulesService],
  exports: [AuditSchedulesService],
})
export class AuditSchedulesModule {}
