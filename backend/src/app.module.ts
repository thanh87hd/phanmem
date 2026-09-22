import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR, APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppService } from './app.service';
import { AuditInterceptor } from './audit-trail/audit.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RolesGuard } from './auth/guards/roles.guard';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { UsersModule } from './users/users.module';
import { DepartmentsModule } from './departments/departments.module';
import { AuditUniverseModule } from './audit-universe/audit-universe.module';
import { RiskCriteriaModule } from './risk-criteria/risk-criteria.module';
import { AuthModule } from './auth/auth.module';
import { RiskAssessmentsModule } from './risk-assessments/risk-assessments.module';
import { AuditPlansModule } from './audit-plans/audit-plans.module';
import { WorkingPapersModule } from './working-papers/working-papers.module';
import { WorkingPaperTemplatesModule } from './working-paper-templates/working-paper-templates.module';
import { AuditFindingsModule } from './audit-findings/audit-findings.module';
import { AuditReportsModule } from './audit-reports/audit-reports.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { RolesModule } from './roles/roles.module';
import { AuditEngagementsModule } from './audit-engagements/audit-engagements.module';
import { AuditTasksModule } from './audit-tasks/audit-tasks.module';
import { TimesheetsModule } from './timesheets/timesheets.module';
import { QualityReviewsModule } from './quality-reviews/quality-reviews.module';
import { ImportModule } from './import/import.module';
import { AuditTrailModule } from './audit-trail/audit-trail.module';
import { EvidencesModule } from './evidences/evidences.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { KpiModule } from './kpi/kpi.module';
import { MailModule } from './mail/mail.module';
import { AuditCommitteeModule } from './audit-committee/audit-committee.module';
import { RegulatoryExamsModule } from './regulatory-exams/regulatory-exams.module';
import { AuditTemplatesModule } from './audit-templates/audit-templates.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { QaipModule } from './qaip/qaip.module';
import { IndependenceModule } from './independence/independence.module';
import { GeneralTasksModule } from './general-tasks/general-tasks.module';
import { AuditExpensesModule } from './audit-expenses/audit-expenses.module';
import { AuditSchedulesModule } from './audit-schedules/audit-schedules.module';
import { TrainingModule } from './training/training.module';
import { AiModule } from './ai/ai.module';
import { ContinuousMonitoringModule } from './continuous-monitoring/continuous-monitoring.module';
import { ExtractionModule } from './extraction/extraction.module';
import { SystemManagementModule } from './system-management/system-management.module';
import { ExternalDatabaseModule } from './external-database/external-database.module';
import { DocumentsModule } from './documents/documents.module';
import { FileAssetsModule } from './file-assets/file-assets.module';
import { RiskControlMatrixModule } from './risk-control-matrix/risk-control-matrix.module';
import { RiskRegisterModule } from './risk-register/risk-register.module';
import { ThematicModule } from './thematic/thematic.module';
import { TestOfControlModule } from './test-of-control/test-of-control.module';
import { AuditRatingModule } from './audit-rating/audit-rating.module';
import { ScenarioAnalysisModule } from './scenario-analysis/scenario-analysis.module';
import { ResourceCapacityModule } from './resource-capacity/resource-capacity.module';
import { RaciGovernanceModule } from './raci-governance/raci-governance.module';
import { AuditCharterModule } from './audit-charter/audit-charter.module';
import { RiskIndicatorsModule } from './risk-indicators/risk-indicators.module';
import { IaStrategicPlanModule } from './ia-strategic-plan/ia-strategic-plan.module';
import { LpbankPackageModule } from './lpbank-package/lpbank-package.module';
import { CustomFieldsModule } from './custom-fields/custom-fields.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { ReportsModule } from './reports/reports.module';
import { FrameworkModule } from './framework/framework.module';
import { DynamicWorkflowsModule } from './dynamic-workflows/dynamic-workflows.module';
import { CacheModule } from '@nestjs/cache-manager';
import { TasksModule } from './tasks/tasks.module';
import { TransactionsModule } from './transactions/transactions.module';
import { BullModule } from '@nestjs/bullmq';
import { JobsModule } from './jobs/jobs.module';
import { MonitorModule } from './monitor/monitor.module';
import { DataIngestionModule } from './data-ingestion/data-ingestion.module';
import { ScopeFilterModule } from './utils/scope-filter.module';
import { StorageModule } from './common/storage/storage.module';

@Module({
  imports: [
    StorageModule,
    ScopeFilterModule,
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 600000, // 10 minutes in ms
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'ktnb_user'),
        password: configService.get('DB_PASSWORD', 'ktnb_password'),
        database: configService.get('DB_NAME', 'ktnb_db'),
        autoLoadEntities: true,
        synchronize:
          process.env.NODE_ENV !== 'production' &&
          process.env.TYPEORM_SYNC === 'true', // Chỉ bật khi có cờ TYPEORM_SYNC=true
        extra: {
          max: 100, // Tối đa 100 kết nối đồng thời trong pool
          connectionTimeoutMillis: 30000, // Hạn chót kết nối
          idleTimeoutMillis: 10000, // Giải phóng kết nối rỗi sau 10s
        },
      }),
      inject: [ConfigService],
    }),
    AuditTrailModule,
    UsersModule,
    DepartmentsModule,
    AuditUniverseModule,
    RiskCriteriaModule,
    AuthModule,
    RiskAssessmentsModule,
    AuditPlansModule,
    WorkingPapersModule,
    WorkingPaperTemplatesModule,
    AuditFindingsModule,
    AuditReportsModule,
    RecommendationsModule,
    RolesModule,
    AuditEngagementsModule,
    AuditTasksModule,
    TimesheetsModule,
    QualityReviewsModule,
    ImportModule,
    EvidencesModule,
    NotificationsModule,
    DashboardModule,
    KpiModule,
    MailModule,
    AuditCommitteeModule,
    RegulatoryExamsModule,
    AuditTemplatesModule,
    AnalyticsModule,
    QaipModule,
    IndependenceModule,
    GeneralTasksModule,
    AuditExpensesModule,
    AuditSchedulesModule,
    TrainingModule,
    AiModule,
    ContinuousMonitoringModule,
    // SeederModule, // Disabled seeder
    ExtractionModule,
    SystemManagementModule,
    ExternalDatabaseModule,
    DocumentsModule,
    FileAssetsModule,
    RiskControlMatrixModule,
    RiskRegisterModule,
    ThematicModule,
    TestOfControlModule,
    AuditRatingModule,
    ScenarioAnalysisModule,
    ResourceCapacityModule,
    RaciGovernanceModule,
    AuditCharterModule,
    RiskIndicatorsModule,
    IaStrategicPlanModule,
    LpbankPackageModule,
    CustomFieldsModule,
    WorkflowsModule,
    ReportsModule,
    JobsModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD', ''),
          skipVersionCheck: true,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          timeout: 60000, // 60s max execution per task
          removeOnComplete: { count: 200 },
          removeOnFail: { count: 1000 },
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 2000, // Giới hạn 2000 req/min cho các API thông thường
      },
    ]),
    FrameworkModule,
    DynamicWorkflowsModule,
    TasksModule,
    TransactionsModule,
    MonitorModule,
    DataIngestionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
