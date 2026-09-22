import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataIngestionBatch } from './entities/data-ingestion-batch.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { FactDailyMetric } from '../continuous-monitoring/entities/fact-daily-metric.entity';
import { KriAlert } from '../risk-indicators/entities/kri-alert.entity';
import { KriRuleConfig } from '../continuous-monitoring/entities/kri-rule-config.entity';
import { DataIngestionService } from './data-ingestion.service';
import { DataIngestionController } from './data-ingestion.controller';
import { DataWatcherService } from './data-watcher.service';
import { DataPipelineService } from './data-pipeline.service';
import { ContinuousMonitoringModule } from '../continuous-monitoring/continuous-monitoring.module';
import { RiskIndicatorsModule } from '../risk-indicators/risk-indicators.module';

@Module({
  imports: [
    RiskIndicatorsModule,
    TypeOrmModule.forFeature([
      DataIngestionBatch,
      Transaction,
      FactDailyMetric,
      KriAlert,
      KriRuleConfig,
    ]),
    ContinuousMonitoringModule,
  ],
  controllers: [DataIngestionController],
  providers: [DataIngestionService, DataWatcherService, DataPipelineService],
  exports: [DataIngestionService, DataWatcherService, DataPipelineService],
})
export class DataIngestionModule {}
