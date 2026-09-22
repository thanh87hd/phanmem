import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { KnowledgeRagService } from './knowledge-rag.service';
import { RegulatoryKnowledge } from '../entities/regulatory-knowledge.entity';
import { FindingKnowledge } from '../entities/finding-knowledge.entity';
import { DocumentChunk } from '../entities/document-chunk.entity';
import { ExtractionService } from '../../extraction/extraction.service';
import { OllamaService } from '../ollama.service';

describe('KnowledgeRagService', () => {
  let service: KnowledgeRagService;
  let regRepo: any;
  let kbRepo: any;
  let chunkRepo: any;
  let extractionService: any;
  let ollamaService: any;

  beforeEach(async () => {
    const createMockQb = (mockResults: any[] = []) => ({
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(mockResults),
    });

    regRepo = {
      createQueryBuilder: jest.fn(() =>
        createMockQb([
          {
            id: 1,
            code: 'TT13',
            title: 'Thông tư 13/2018',
            summary: 'Hệ thống kiểm soát nội bộ',
          },
        ]),
      ),
    };

    kbRepo = {
      createQueryBuilder: jest.fn(() =>
        createMockQb([
          {
            id: 1,
            title: 'Hồ sơ tín dụng thiếu thẩm định',
            defectCode: 'CR01',
          },
        ]),
      ),
    };

    chunkRepo = {
      createQueryBuilder: jest.fn(() =>
        createMockQb([
          {
            id: 10,
            regulatoryKnowledgeId: 1,
            heading: 'Điều 14',
            pageNumber: 5,
            content: 'Nội dung kiểm soát rủi ro tín dụng...',
            regulatoryKnowledge: {
              code: 'TT13',
              title: 'Thông tư 13',
              type: 'Thông tư',
              businessProcess: 'Tín dụng',
            },
          },
        ]),
      ),
    };

    extractionService = {};
    ollamaService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeRagService,
        { provide: getRepositoryToken(RegulatoryKnowledge), useValue: regRepo },
        { provide: getRepositoryToken(FindingKnowledge), useValue: kbRepo },
        { provide: getRepositoryToken(DocumentChunk), useValue: chunkRepo },
        { provide: ExtractionService, useValue: extractionService },
        { provide: OllamaService, useValue: ollamaService },
      ],
    }).compile();

    service = module.get<KnowledgeRagService>(KnowledgeRagService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchRegulatory', () => {
    it('should search regulatory documents with query', async () => {
      const results = await service.searchRegulatory('kiểm soát', 5);
      expect(results).toHaveLength(1);
      expect(regRepo.createQueryBuilder).toHaveBeenCalledWith('reg');
    });

    it('should search regulatory documents when query is empty', async () => {
      const results = await service.searchRegulatory('', 10);
      expect(results).toHaveLength(1);
    });
  });

  describe('searchRegulatoryChunks', () => {
    it('should return empty array if query is empty or whitespace', async () => {
      const results = await service.searchRegulatoryChunks('   ');
      expect(results).toEqual([]);
    });

    it('should query chunks with full query and individual terms and map result', async () => {
      const results = await service.searchRegulatoryChunks(
        'kiểm soát rủi ro',
        5,
      );
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        chunkId: 10,
        regulatoryKnowledgeId: 1,
        documentCode: 'TT13',
        documentTitle: 'Thông tư 13',
        documentType: 'Thông tư',
        businessProcess: 'Tín dụng',
        heading: 'Điều 14',
        pageNumber: 5,
        content: 'Nội dung kiểm soát rủi ro tín dụng...',
      });
    });
  });

  describe('searchFindingKnowledge', () => {
    it('should search finding knowledge repository', async () => {
      const results = await service.searchFindingKnowledge('tín dụng', 5);
      expect(results).toHaveLength(1);
      expect(kbRepo.createQueryBuilder).toHaveBeenCalledWith('kb');
    });
  });
});
