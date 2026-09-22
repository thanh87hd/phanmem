import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContinuousMonitoringService } from './continuous-monitoring.service';
import { ContinuousMonitoringController } from './continuous-monitoring.controller';
import { MonitoringAlert } from './entities/monitoring-alert.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../users/entities/user.entity';
import { TransactionsModule } from '../transactions/transactions.module';
import { KriBacktestResult } from './entities/kri-backtest-result.entity';
import { FactDailyMetric } from './entities/fact-daily-metric.entity';
import { DebtMigrationRecord } from './entities/debt-migration.entity';
import { KriRuleConfig } from './entities/kri-rule-config.entity';
import { AuditCase } from './entities/audit-case.entity';
import { ContinuousAuditRule } from './entities/continuous-audit-rule.entity';
import { KriBacktestingService } from './kri-backtesting.service';
import { KriBacktestingController } from './kri-backtesting.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MonitoringAlert,
      User,
      KriBacktestResult,
      FactDailyMetric,
      DebtMigrationRecord,
      KriRuleConfig,
      AuditCase,
      ContinuousAuditRule,
    ]),
    NotificationsModule,
    TransactionsModule,
  ],
  controllers: [ContinuousMonitoringController, KriBacktestingController],
  providers: [ContinuousMonitoringService, KriBacktestingService],
  exports: [ContinuousMonitoringService, KriBacktestingService],
})
export class ContinuousMonitoringModule {}
