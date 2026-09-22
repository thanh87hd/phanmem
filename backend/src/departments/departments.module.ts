import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartmentsService } from './departments.service';
import { DepartmentsController } from './departments.controller';
import { Department } from './entities/department.entity';
import { AuditUniverse } from '../audit-universe/entities/audit-universe.entity';
import { User } from '../users/entities/user.entity';

import { DepartmentHistory } from './entities/department-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Department,
      DepartmentHistory,
      AuditUniverse,
      User,
    ]),
  ],
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
