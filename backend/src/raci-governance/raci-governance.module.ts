import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditProcess } from './entities/audit-process.entity';
import { ProcessActivity } from './entities/process-activity.entity';
import { RaciAssignment } from './entities/raci-assignment.entity';
import { RaciGovernanceService } from './raci-governance.service';
import { RaciGovernanceController } from './raci-governance.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditProcess, ProcessActivity, RaciAssignment]),
  ],
  controllers: [RaciGovernanceController],
  providers: [RaciGovernanceService],
  exports: [RaciGovernanceService],
})
export class RaciGovernanceModule {}
