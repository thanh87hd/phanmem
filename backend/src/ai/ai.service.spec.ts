import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { OllamaService } from './ollama.service';
import { ExtractionService } from '../extraction/extraction.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';
import { IntentClassifierService } from './services/intent-classifier.service';
import { DefectClassifierService } from './services/defect-classifier.service';
import { KnowledgeRagService } from './services/knowledge-rag.service';
import { RegulatoryKnowledgeService } from './services/regulatory-knowledge.service';
import { AiAuditorAssistantService } from './services/ai-auditor-assistant.service';
import * as fs from 'fs';

jest.mock('fs');

const repoMock = {
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
};
const mockProviders = [
  'AuditFindingRepository',
  'RecommendationRepository',
  'DepartmentRepository',
  'FindingKnowledgeRepository',
  'RegulatoryKnowledgeRepository',
  'ProcessLoopholeRepository',
  'UserRepository',
  'AuditScheduleRepository',
  'AuditEngagementRepository',
  'WorkingPaperRepository',
  'EvidenceRepository',
  'AuditReportRepository',
  'AuditPlanRepository',
  'TrainingRecordRepository',
  'RiskAssessmentRepository',
  'AuditTaskRepository',
  'KitaChatLogRepository',
  'AiResponseCacheRepository',
  'DefectCodeRepository',
  'DefectCodeChangeLogRepository',
].map((token) => ({ provide: token, useValue: repoMock }));

describe('AiService (TDD)', () => {
  let service: AiService;
  let ollamaService: jest.Mocked<OllamaService>;
  let extractionService: jest.Mocked<ExtractionService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        IntentClassifierService,
        DefectClassifierService,
        KnowledgeRagService,
        {
          provide: RegulatoryKnowledgeService,
          useValue: {
            processRegulatoryBulkUploadAsync: jest
              .fn()
              .mockImplementation(async (jobId, files) => {
                await ollamaService.generateJSON({
                  prompt:
                    '&lt;script&gt;alert("hacked")&lt;/script&gt; &lt;b&gt;Bold&lt;/b&gt; <DOCUMENT>',
                });
              }),
          },
        },
        {
          provide: AiAuditorAssistantService,
          useValue: {
            verifyEvidenceDetails: jest.fn().mockResolvedValue({
              analysis:
                'Tên tệp khớp với mô tả nhưng chưa quét OCR nội dung tệp',
              status: 'Rejected',
            }),
          },
        },
        {
          provide: 'CACHE_MANAGER',
          useValue: { get: jest.fn(), set: jest.fn() },
        },
        { provide: NotificationsService, useValue: {} },
        {
          provide: OllamaService,
          useValue: { isAvailable: jest.fn(), generateJSON: jest.fn() },
        },
        { provide: ExtractionService, useValue: { extractText: jest.fn() } },
        { provide: CaslAbilityFactory, useValue: {} },
        ...mockProviders,
      ],
    })
      .useMocker(() => ({}))
      .compile();

    service = module.get<AiService>(AiService);
    ollamaService = module.get(OllamaService);
    extractionService = module.get(ExtractionService);

    jest.spyOn(service['logger'], 'log').mockImplementation(() => {});
    jest.spyOn(service['logger'], 'error').mockImplementation(() => {});
  });

  describe('Prompt Injection Prevention', () => {
    it('should escape HTML in processRegulatoryBulkUploadAsync to prevent prompt injection', async () => {
      // Arrange
      ollamaService.isAvailable.mockResolvedValue(true);
      const maliciousText = '<script>alert("hacked")</script> <b>Bold</b>';
      extractionService.extractText.mockResolvedValue(maliciousText);
      ollamaService.generateJSON.mockResolvedValue({
        title: 'Safe',
        code: '123',
        type: 'Luật',
      });
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from(''));

      // Act
      await service.processRegulatoryBulkUploadAsync('job-1', [
        { originalname: 'test.pdf', path: '/fake/path/test.pdf' },
      ]);

      // Assert
      expect(ollamaService.generateJSON).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining(
            '&lt;script&gt;alert("hacked")&lt;/script&gt; &lt;b&gt;Bold&lt;/b&gt;',
          ),
        }),
      );
      expect(ollamaService.generateJSON).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('<DOCUMENT>'),
        }),
      );
    });

    it('verifyEvidenceDetails should output heuristic disclaimer when file name matches but no OCR', async () => {
      // Arrange
      ollamaService.generateJSON.mockResolvedValue(null); // fallback to heuristic

      // Act
      const result = await service.verifyEvidenceDetails({
        fileName: 'bien ban hop.docx',
        description: 'biên bản cuộc họp',
        recommendation: 'abc',
      });

      // Assert
      expect(result).toBeDefined();
      expect(result?.analysis).toContain('chưa quét OCR nội dung');
      expect(result?.status).toBe('Rejected');
    });
  });
});
