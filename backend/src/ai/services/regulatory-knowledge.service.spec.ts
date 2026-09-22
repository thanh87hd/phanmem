import * as fs from 'fs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RegulatoryKnowledgeService } from './regulatory-knowledge.service';
import { RegulatoryKnowledge } from '../entities/regulatory-knowledge.entity';
import { DocumentChunk } from '../entities/document-chunk.entity';
import { ExtractionService } from '../../extraction/extraction.service';

jest.mock('fs');
jest.mock('../utils/document-chunker', () => ({
  chunkMarkdownDocument: jest.fn(() => [
    {
      chunkIndex: 0,
      content: 'Chương 1: Quy định chung',
      heading: 'Chương 1',
      pageNumber: 1,
      charCount: 24,
    },
  ]),
}));

describe('RegulatoryKnowledgeService', () => {
  let service: RegulatoryKnowledgeService;
  let regRepo: any;
  let chunkRepo: any;
  let extractionService: any;

  beforeEach(async () => {
    regRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((dto) => ({ ...dto, id: 1 })),
      save: jest.fn((entity) =>
        Promise.resolve({ ...entity, id: entity.id || 1 }),
      ),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    chunkRepo = {
      find: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      create: jest.fn((dto) => ({ ...dto, id: 1 })),
      save: jest.fn((entities) => Promise.resolve(entities)),
    };

    extractionService = {
      extractFull: jest.fn().mockResolvedValue({
        markdown: '# Thông tư 13/2018/TT-NHNN\nNội dung thông tư...',
        category: 'Thông tư NHNN',
        pageCount: 10,
        extractionMethod: 'pdfjs',
        confidence: 0.95,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegulatoryKnowledgeService,
        { provide: getRepositoryToken(RegulatoryKnowledge), useValue: regRepo },
        { provide: getRepositoryToken(DocumentChunk), useValue: chunkRepo },
        { provide: ExtractionService, useValue: extractionService },
      ],
    }).compile();

    service = module.get<RegulatoryKnowledgeService>(
      RegulatoryKnowledgeService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllRegulatory and getRegulatoryById', () => {
    it('should return all regulatory documents sorted', async () => {
      regRepo.find.mockResolvedValue([{ id: 1, code: 'TT13' }]);
      const result = await service.getAllRegulatory();
      expect(result).toHaveLength(1);
      expect(regRepo.find).toHaveBeenCalledWith({
        order: { type: 'ASC', code: 'ASC' },
      });
    });

    it('should return document by id with chunks', async () => {
      regRepo.findOne.mockResolvedValue({ id: 1, code: 'TT13', chunks: [] });
      const result = await service.getRegulatoryById(1);
      expect(result?.id).toBe(1);
      expect(regRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['chunks'],
      });
    });

    it('should return document chunks', async () => {
      chunkRepo.find.mockResolvedValue([{ id: 1, chunkIndex: 0 }]);
      const chunks = await service.getDocumentChunks(1);
      expect(chunks).toHaveLength(1);
      expect(chunkRepo.find).toHaveBeenCalledWith({
        where: { regulatoryKnowledgeId: 1 },
        order: { chunkIndex: 'ASC' },
      });
    });
  });

  describe('rechunkDocument', () => {
    it('should return 0 when id or markdown is empty', async () => {
      expect(await service.rechunkDocument(0, '')).toBe(0);
      expect(await service.rechunkDocument(1, '')).toBe(0);
    });

    it('should chunk document and save chunks to repository', async () => {
      const count = await service.rechunkDocument(1, '# Sample markdown text');
      expect(chunkRepo.delete).toHaveBeenCalledWith({
        regulatoryKnowledgeId: 1,
      });
      expect(chunkRepo.create).toHaveBeenCalled();
      expect(chunkRepo.save).toHaveBeenCalled();
      expect(count).toBe(1);
    });
  });

  describe('createRegulatory and updateRegulatory', () => {
    it('should create new regulatory and rechunk if fullContent present', async () => {
      const dto = {
        code: 'TT83',
        title: 'Thông tư 83',
        fullContent: '# Full Content',
      };
      const result = await service.createRegulatory(dto);
      expect(regRepo.create).toHaveBeenCalledWith(dto);
      expect(regRepo.save).toHaveBeenCalled();
      expect(chunkRepo.save).toHaveBeenCalled();
      expect(result.code).toBe('TT83');
    });

    it('should update regulatory and rechunk if fullContent updated', async () => {
      regRepo.findOne.mockResolvedValue({
        id: 1,
        code: 'TT83',
        fullContent: 'Updated',
      });
      const result = await service.updateRegulatory(1, {
        fullContent: 'Updated',
      });
      expect(regRepo.update).toHaveBeenCalledWith(1, {
        fullContent: 'Updated',
      });
      expect(result?.code).toBe('TT83');
    });

    it('should delete regulatory successfully', async () => {
      const result = await service.deleteRegulatory(1);
      expect(result).toEqual({ success: true });
      expect(regRepo.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('jobTracker and processRegulatoryBulkUploadAsync', () => {
    it('should track job progress and update entities', async () => {
      const jobId = 'test-job-1';
      const files = [
        {
          buffer: Buffer.from('test content'),
          originalname: 'TT13_2018.pdf',
        },
      ];

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await service.processRegulatoryBulkUploadAsync(jobId, files);

      const status = service.getJobStatus(jobId) as any;
      expect(status.status).toBe('completed');
      expect(status.total).toBe(1);
      expect(status.success).toBe(1);
      expect(extractionService.extractFull).toHaveBeenCalled();
    });

    it('should return not_found for unknown job id', () => {
      const status = service.getJobStatus('unknown-job');
      expect(status).toEqual({ status: 'not_found' });
    });
  });

  describe('scanDirectoryForRegulations', () => {
    it('should return false if directory does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const result =
        await service.scanDirectoryForRegulations('/non/existent/dir');
      expect(result.success).toBe(false);
      expect(result.message).toContain('không tồn tại');
    });

    it('should scan directory, parse valid files and import them', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        'TT13.pdf',
        'notes.txt',
        'ignored.exe',
      ] as any);
      (fs.statSync as jest.Mock).mockImplementation((filePath: string) => ({
        isFile: () => !filePath.includes('ignored.exe'),
      }));

      const result = await service.scanDirectoryForRegulations('/valid/dir');
      expect(result.success).toBe(true);
      expect(result.imported).toBeGreaterThan(0);
      expect(extractionService.extractFull).toHaveBeenCalled();
    });
  });
});
