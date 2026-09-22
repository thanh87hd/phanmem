import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditTemplatesController } from './audit-templates.controller';
import { AuditTemplatesService } from './audit-templates.service';
import { AuditTemplate } from './entities/audit-template.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditTemplate])],
  controllers: [AuditTemplatesController],
  providers: [AuditTemplatesService],
})
export class AuditTemplatesModule {}
