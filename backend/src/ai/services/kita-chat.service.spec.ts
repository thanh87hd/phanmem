import { Test, TestingModule } from '@nestjs/testing';
import { KitaChatService } from './kita-chat.service';
import { OllamaService } from '../ollama.service';
import { IntentClassifierService } from './intent-classifier.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CaslAbilityFactory } from '../../casl/casl-ability.factory';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditFinding } from '../../audit-findings/entities/audit-finding.entity';
import { Recommendation } from '../../recommendations/entities/recommendation.entity';
import { FindingKnowledge } from '../entities/finding-knowledge.entity';
import { RegulatoryKnowledge } from '../entities/regulatory-knowledge.entity';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';
import { AuditSchedule } from '../../audit-schedules/entities/audit-schedule.entity';
import { AuditEngagement } from '../../audit-engagements/entities/audit-engagement.entity';
import { WorkingPaper } from '../../working-papers/entities/working-paper.entity';
import { Evidence } from '../../evidences/entities/evidence.entity';
import { AuditReport } from '../../audit-reports/entities/audit-report.entity';
import { AuditPlan } from '../../audit-plans/entities/audit-plan.entity';
import { TrainingRecord } from '../../training/entities/training-record.entity';
import { RiskAssessment } from '../../risk-assessments/entities/risk-assessment.entity';
import { AuditTask } from '../../audit-tasks/entities/audit-task.entity';
import { KitaChatLog } from '../entities/kita-chat-log.entity';
import { AiResponseCache } from '../entities/ai-response-cache.entity';

describe('KitaChatService', () => {
  let service: KitaChatService;

  const mockOllamaService = {
    chat: jest.fn(),
    isAvailable: jest.fn().mockResolvedValue(false),
    classifyIntent: jest.fn(),
  };

  const mockIntentClassifier = {
    classify: jest.fn().mockResolvedValue('GENERAL'),
  };

  const mockNotificationsService = {
    sendNotification: jest.fn(),
  };

  const mockCaslAbilityFactory = {
    createForUser: jest.fn().mockReturnValue({
      can: jest.fn().mockReturnValue(true),
      cannot: jest.fn().mockReturnValue(false),
    }),
  };

  const mockCacheManager = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  };

  const genericRepoMock = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ avgTime: 120 }),
      getRawMany: jest.fn().mockResolvedValue([]),
    }),
  };

  const entities = [
    AuditFinding,
    Recommendation,
    FindingKnowledge,
    RegulatoryKnowledge,
    User,
    Department,
    AuditSchedule,
    AuditEngagement,
    WorkingPaper,
    Evidence,
    AuditReport,
    AuditPlan,
    TrainingRecord,
    RiskAssessment,
    AuditTask,
    KitaChatLog,
    AiResponseCache,
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    const repoProviders = entities.map((entity) => ({
      provide: getRepositoryToken(entity),
      useValue: genericRepoMock,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KitaChatService,
        { provide: OllamaService, useValue: mockOllamaService },
        { provide: IntentClassifierService, useValue: mockIntentClassifier },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: CaslAbilityFactory, useValue: mockCaslAbilityFactory },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        ...repoProviders,
      ],
    }).compile();

    service = module.get<KitaChatService>(KitaChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('kitaChat', () => {
    it('should return transparent no-info reply when no data and intent is general', async () => {
      const result = await service.kitaChat({ message: 'Xin chào bạn' });
      expect(result).toBeDefined();
      expect(result.reply).toContain('Kita');
      expect(result.category).toBe('General');
    });

    it('should return cached answer if exact match in cache', async () => {
      mockCacheManager.get.mockResolvedValueOnce({
        reply: 'Cached answer',
        category: 'Test',
        source: 'Cache',
      });

      const result = await service.kitaChat({ message: 'Câu hỏi đã có cache' });
      expect(result.reply).toBe('Cached answer');
      expect(result.category).toBe('Test');
    });
  });

  describe('getChatAnalytics', () => {
    it('should return aggregated metrics', async () => {
      const analytics = await service.getChatAnalytics();
      expect(analytics).toBeDefined();
      expect(analytics.totalQuestions).toBe(0);
      expect(analytics.fallbackRate).toBe(0);
      expect(analytics.intentDistribution).toEqual([]);
    });
  });
});
