import { Test, TestingModule } from '@nestjs/testing';
import { AiAuditorAssistantService } from './ai-auditor-assistant.service';
import { OllamaService } from '../ollama.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FindingKnowledge } from '../entities/finding-knowledge.entity';
import { RegulatoryKnowledge } from '../entities/regulatory-knowledge.entity';
import { DefectCode } from '../entities/defect-code.entity';

describe('AiAuditorAssistantService', () => {
  let service: AiAuditorAssistantService;

  const mockOllamaService = {
    generateJSON: jest.fn(),
    chat: jest.fn(),
  };

  const genericRepoMock = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
  };

  const entities = [FindingKnowledge, RegulatoryKnowledge, DefectCode];

  beforeEach(async () => {
    jest.clearAllMocks();

    const repoProviders = entities.map((entity) => ({
      provide: getRepositoryToken(entity),
      useValue: genericRepoMock,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAuditorAssistantService,
        { provide: OllamaService, useValue: mockOllamaService },
        ...repoProviders,
      ],
    }).compile();

    service = module.get<AiAuditorAssistantService>(AiAuditorAssistantService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('runLocalLlamaInference', () => {
    it('should return parsed result with 5-Whys RCA and criteria when Ollama returns JSON', async () => {
      mockOllamaService.generateJSON.mockResolvedValue({
        suggestedTitle: 'Phát hiện sai phạm giải ngân',
        suggestedRiskLevel: 'High',
        suggestedCategory: 'Process',
        suggestedConsequence: 'Rủi ro thất thoát vốn vay',
        suggestedCause: 'Cán bộ không tuân thủ quy trình kiểm soát',
        suggestedRca:
          'Why 1: Giải ngân sai -> Why 5: Thiếu chốt chặn tự động trên Core Banking',
        suggestedRecommendation: 'Kiểm tra lại chứng từ và thiết lập chốt chặn',
        suggestedCriteria: 'Khoản 2 Điều 14 Thông tư 13/2018/TT-NHNN',
      });

      const result = await service.runLocalLlamaInference(
        'Khách hàng giải ngân không có hoá đơn',
      );
      expect(result).toBeDefined();
      expect(result.suggestedTitle).toBe('Phát hiện sai phạm giải ngân');
      expect(result.suggestedRiskLevel).toBe('High');
      expect(result.suggestedCategory).toBe('Process');
      expect(result.suggestedRca).toContain('Why 5');
      expect(result.suggestedCriteria).toContain('Thông tư 13/2018');
      expect(result.confidence).toBe(0.9);
    });

    it('should return null when Ollama returns null', async () => {
      mockOllamaService.generateJSON.mockResolvedValue(null);
      const result = await service.runLocalLlamaInference('test');
      expect(result).toBeNull();
    });
  });

  describe('runLocalLlamaWorkingPaperInference and suggestWorkingPaperMeta', () => {
    it('should return inference result when Ollama succeeds', async () => {
      mockOllamaService.generateJSON.mockResolvedValue({
        objectives: 'Mục tiêu kiểm toán tín dụng',
        riskDescription: 'Rủi ro hồ sơ định giá',
      });

      const result = await service.suggestWorkingPaperMeta(
        'Kiểm toán hồ sơ tín dụng',
      );
      expect(result.objectives).toBe('Mục tiêu kiểm toán tín dụng');
    });

    it('should fallback to heuristic when Ollama returns null for credit domain', async () => {
      mockOllamaService.generateJSON.mockResolvedValue(null);

      const result = await service.suggestWorkingPaperMeta(
        'Kiểm tra hồ sơ cho vay khách hàng',
      );
      expect(result.referencePrefix).toBe('CREDIT');
      expect(result.domainLabel).toContain('Credit Audit');
      expect(result.objectives).toContain('MỤC TIÊU KIỂM TOÁN');
    });

    it('should fallback to heuristic when Ollama returns null for IT domain', async () => {
      mockOllamaService.generateJSON.mockResolvedValue(null);

      const result = await service.suggestWorkingPaperMeta(
        'Kiểm toán an toàn thông tin Core Banking',
      );
      expect(result.referencePrefix).toBe('IT');
      expect(result.domainLabel).toContain('IT Audit');
    });
  });

  describe('suggestRcm', () => {
    it('should return RCM from Ollama when available', async () => {
      mockOllamaService.generateJSON.mockResolvedValue([
        { riskName: 'Rủi ro 1', controlName: 'Kiểm soát 1' },
      ]);

      const result = await service.suggestRcm('Quy trình Tín dụng');
      expect(result).toHaveLength(1);
      expect(result[0].riskName).toBe('Rủi ro 1');
    });

    it('should fallback to credit RCM when Ollama returns null', async () => {
      mockOllamaService.generateJSON.mockResolvedValue(null);

      const result = await service.suggestRcm(
        'Quy trình thẩm định hồ sơ vay vốn',
      );
      expect(result).toHaveLength(2);
      expect(result[0].riskName).toBe('Giải ngân sai mục đích');
    });

    it('should fallback to IT RCM when process contains IT keywords', async () => {
      mockOllamaService.generateJSON.mockResolvedValue(null);

      const result = await service.suggestRcm(
        'Quản lý hệ thống công nghệ thông tin',
      );
      expect(result).toHaveLength(2);
      expect(result[0].riskName).toBe('Truy cập trái phép hệ thống');
    });
  });
});
