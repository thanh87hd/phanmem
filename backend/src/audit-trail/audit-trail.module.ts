import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { SecurityAlert } from './entities/security-alert.entity';
import { AuditTrailService } from './audit-trail.service';
import { AuditTrailController } from './audit-trail.controller';
import { CaslModule } from '../casl/casl.module';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, SecurityAlert]), CaslModule],
  controllers: [AuditTrailController],
  providers: [AuditTrailService],
  exports: [AuditTrailService], // Export so other modules can inject it
})
export class AuditTrailModule {}
