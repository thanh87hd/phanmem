import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import { AuditReport } from '../audit-reports/entities/audit-report.entity';
import { User } from '../users/entities/user.entity';
import { AlertService } from './alert.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, Recommendation, AuditReport, User]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, AlertService],
  exports: [NotificationsService], // Exported so other modules can send notifications
})
export class NotificationsModule {}
