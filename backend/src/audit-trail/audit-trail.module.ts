import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { SecurityAlert } from './entities/security-alert.entity';
import { AuditTrailService } from './audit-trail.service';
import { AuditTrailController } from './audit-trail.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, SecurityAlert])],
  controllers: [AuditTrailController],
  providers: [AuditTrailService],
  exports: [AuditTrailService], // Export so other modules can inject it
})
export class AuditTrailModule {}
