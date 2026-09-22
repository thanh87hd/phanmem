import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditRating } from './entities/audit-rating.entity';
import { AuditRatingService } from './audit-rating.service';
import { AuditRatingController } from './audit-rating.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AuditRating])],
  controllers: [AuditRatingController],
  providers: [AuditRatingService],
  exports: [AuditRatingService],
})
export class AuditRatingModule {}
