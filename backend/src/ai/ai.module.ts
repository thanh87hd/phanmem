import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';

import { FindingKnowledge } from './entities/finding-knowledge.entity';
import { RegulatoryKnowledge } from './entities/regulatory-knowledge.entity';
import { DocumentChunk } from './entities/document-chunk.entity';

import { ProcessLoophole } from './entities/process-loophole.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import { AuditSchedule } from '../audit-schedules/entities/audit-schedule.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';
import { OllamaService } from './ollama.service';
import { ExtractionModule } from '../extraction/extraction.module';
import { CaslModule } from '../casl/casl.module';

// === Kita Hybrid Chatbot: Extended entity imports ===
import { WorkingPaper } from '../working-papers/entities/working-paper.entity';
import { Evidence } from '../evidences/entities/evidence.entity';
import { AuditReport } from '../audit-reports/entities/audit-report.entity';
import { AuditPlan } from '../audit-plans/entities/audit-plan.entity';
import { TrainingRecord } from '../training/entities/training-record.entity';
import { RiskAssessment } from '../risk-assessments/entities/risk-assessment.entity';
import { AuditTask } from '../audit-tasks/entities/audit-task.entity';
import { KitaChatLog } from './entities/kita-chat-log.entity';
import { AiResponseCache } from './entities/ai-response-cache.entity';
import { DefectCode } from './entities/defect-code.entity';
import { DefectCodeChangeLog } from './entities/defect-code-changelog.entity';
import { IntentClassifierService } from './services/intent-classifier.service';
import { DefectClassifierService } from './services/defect-classifier.service';
import { KnowledgeRagService } from './services/knowledge-rag.service';
import { RegulatoryKnowledgeService } from './services/regulatory-knowledge.service';
import { LoopholeDetectionService } from './services/loophole-detection.service';
import { ResourceAllocationService } from './services/resource-allocation.service';
import { AiAuditorAssistantService } from './services/ai-auditor-assistant.service';
import { KitaChatService } from './services/kita-chat.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditFinding,
      Recommendation,
      FindingKnowledge,
      RegulatoryKnowledge,
      DocumentChunk,
      ProcessLoophole,
      User,
      Department,
      AuditSchedule,
      AuditEngagement,
      // === Kita Hybrid: Extended DB access ===
      WorkingPaper,
      Evidence,
      AuditReport,
      AuditPlan,
      TrainingRecord,
      RiskAssessment,
      AuditTask,
      KitaChatLog,
      AiResponseCache,
      DefectCode,
      DefectCodeChangeLog,
    ]),
    NotificationsModule,
    ExtractionModule,
    CaslModule,
  ],
  providers: [
    AiService,
    OllamaService,
    IntentClassifierService,
    DefectClassifierService,
    KnowledgeRagService,
    RegulatoryKnowledgeService,
    LoopholeDetectionService,
    ResourceAllocationService,
    AiAuditorAssistantService,
    KitaChatService,
  ],
  controllers: [AiController],
  exports: [
    AiService,
    OllamaService,
    IntentClassifierService,
    DefectClassifierService,
    KnowledgeRagService,
    RegulatoryKnowledgeService,
    LoopholeDetectionService,
    ResourceAllocationService,
    AiAuditorAssistantService,
    KitaChatService,
  ],
})
export class AiModule {}
