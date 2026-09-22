import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditUniverseService } from './audit-universe.service';
import { AuditUniverseController } from './audit-universe.controller';
import { AuditUniverse } from './entities/audit-universe.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditUniverse, AuditFinding])],
  controllers: [AuditUniverseController],
  providers: [AuditUniverseService],
  exports: [AuditUniverseService],
})
export class AuditUniverseModule {}
