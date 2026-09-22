import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditTasksController } from './audit-tasks.controller';
import { AuditTasksService } from './audit-tasks.service';
import { AuditTask } from './entities/audit-task.entity';

import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [TypeOrmModule.forFeature([AuditTask]), TasksModule],
  controllers: [AuditTasksController],
  providers: [AuditTasksService],
  exports: [AuditTasksService],
})
export class AuditTasksModule {}
