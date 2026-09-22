import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditCharter } from './entities/audit-charter.entity';
import { AuditCharterService } from './audit-charter.service';
import { AuditCharterController } from './audit-charter.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AuditCharter])],
  controllers: [AuditCharterController],
  providers: [AuditCharterService],
  exports: [AuditCharterService],
})
export class AuditCharterModule {}
