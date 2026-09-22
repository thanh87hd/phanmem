import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestOfControl } from './entities/test-of-control.entity';
import { ControlException } from './entities/control-exception.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { TestOfControlService } from './test-of-control.service';
import { TestOfControlController } from './test-of-control.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TestOfControl, ControlException, AuditFinding]),
  ],
  controllers: [TestOfControlController],
  providers: [TestOfControlService],
  exports: [TestOfControlService],
})
export class TestOfControlModule {}
