import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditTasksController } from './audit-tasks.controller';
import { AuditTasksService } from './audit-tasks.service';
import { AuditTask } from './entities/audit-task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditTask])],
  controllers: [AuditTasksController],
  providers: [AuditTasksService],
  exports: [AuditTasksService],
})
export class AuditTasksModule {}
