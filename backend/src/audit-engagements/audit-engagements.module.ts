import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEngagementsController } from './audit-engagements.controller';
import { AuditWorkstreamsController } from './audit-workstreams.controller';
import { AuditEngagementsService } from './audit-engagements.service';
import { AuditWorkstreamsService } from './audit-workstreams.service';
import { AuditEngagement } from './entities/audit-engagement.entity';
import { AuditWorkstream } from './entities/audit-workstream.entity';
import { AuditSchedule } from '../audit-schedules/entities/audit-schedule.entity';
import { WorkingPaper } from '../working-papers/entities/working-paper.entity';
import { EngagementChangeRequest } from './entities/engagement-change-request.entity';
import { CaslModule } from '../casl/casl.module';
import { IndependenceModule } from '../independence/independence.module';
import { WorkingPapersModule } from '../working-papers/working-papers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditEngagement,
      AuditWorkstream,
      AuditSchedule,
      WorkingPaper,
      EngagementChangeRequest,
    ]),
    CaslModule,
    IndependenceModule,
    forwardRef(() => WorkingPapersModule),
  ],
  controllers: [AuditEngagementsController, AuditWorkstreamsController],
  providers: [AuditEngagementsService, AuditWorkstreamsService],
  exports: [AuditEngagementsService, AuditWorkstreamsService],
})
export class AuditEngagementsModule {}
