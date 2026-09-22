import { Test, TestingModule } from '@nestjs/testing';
import { ExtractionService } from './extraction.service';
import axios from 'axios';

jest.mock('axios');

// Mock pdf-inspector
jest.mock('@firecrawl/pdf-inspector', () => ({
  classifyPdf: jest.fn(),
  processPdf: jest.fn(),
}));

import { classifyPdf, processPdf } from '@firecrawl/pdf-inspector';

describe('ExtractionService (TDD)', () => {
  let service: ExtractionService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ExtractionService],
    }).compile();

    service = module.get<ExtractionService>(ExtractionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractText', () => {
    it('should return string directly for .md files', async () => {
      const mockFile = {
        originalname: 'test.md',
        buffer: Buffer.from('markdown content'),
      } as any;

      const result = await service.extractText(mockFile);
      expect(result).toBe('markdown content');
      expect(axios.post).not.toHaveBeenCalled();
      expect(classifyPdf).not.toHaveBeenCalled();
    });

    it('should return string directly for .txt files', async () => {
      const mockFile = {
        originalname: 'test.txt',
        buffer: Buffer.from('text content'),
      } as any;

      const result = await service.extractText(mockFile);
      expect(result).toBe('text content');
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('should throw error for unsupported extensions', async () => {
      const mockFile = {
        originalname: 'test.exe',
      } as any;

      await expect(service.extractText(mockFile)).rejects.toThrow(
        'Định dạng file không hỗ trợ',
      );
    });

    it('should extract text-based PDF via pdf-inspector (fast path)', async () => {
      const mockFile = {
        originalname: 'thong_tu_13.pdf',
        buffer: Buffer.from('fake-pdf-bytes'),
      } as any;

      (classifyPdf as jest.Mock).mockReturnValue({
        pdfType: 'TextBased',
        pageCount: 5,
        pagesNeedingOcr: [],
        confidence: 0.95,
      });
      (processPdf as jest.Mock).mockReturnValue({
        markdown: '# Thông tư 13\n\nNội dung chi tiết...',
      });

      const result = await service.extractText(mockFile);
      expect(classifyPdf).toHaveBeenCalledWith(mockFile.buffer);
      expect(processPdf).toHaveBeenCalledWith(mockFile.buffer);
      expect(result).toBe('# Thông tư 13\n\nNội dung chi tiết...');
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('should fallback to OCR service for scanned PDFs', async () => {
      const mockFile = {
        originalname: 'scan.pdf',
        buffer: Buffer.from('scanned-pdf-bytes'),
      } as any;

      (classifyPdf as jest.Mock).mockReturnValue({
        pdfType: 'Scanned',
        pageCount: 3,
        pagesNeedingOcr: [0, 1, 2],
        confidence: 0.9,
      });
      (axios.post as jest.Mock).mockResolvedValue({
        data: { markdown: '# OCR Result', category: 'scan' },
      });

      const result = await service.extractText(mockFile);
      expect(processPdf).not.toHaveBeenCalled();
      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(result).toBe('# OCR Result');
    });

    it('should fallback to OCR service when pdf-inspector returns empty', async () => {
      const mockFile = {
        originalname: 'weird.pdf',
        buffer: Buffer.from('weird-pdf-bytes'),
      } as any;

      (classifyPdf as jest.Mock).mockReturnValue({
        pdfType: 'TextBased',
        pageCount: 1,
        pagesNeedingOcr: [],
        confidence: 0.5,
      });
      (processPdf as jest.Mock).mockReturnValue({ markdown: '' });
      (axios.post as jest.Mock).mockResolvedValue({
        data: { markdown: '# OCR Fallback', category: 'fallback' },
      });

      const result = await service.extractText(mockFile);
      expect(result).toBe('# OCR Fallback');
    });

    it('should route .jpg files to OCR Service directly', async () => {
      const mockFile = {
        originalname: 'photo.jpg',
        buffer: Buffer.from('image-bytes'),
      } as any;

      (axios.post as jest.Mock).mockResolvedValue({
        data: { markdown: '# Image OCR', category: 'image' },
      });

      const result = await service.extractText(mockFile);
      expect(classifyPdf).not.toHaveBeenCalled();
      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(result).toBe('# Image OCR');
    });

    it('should throw error if OCR Service fails for non-PDF', async () => {
      const mockFile = {
        originalname: 'doc.docx',
        buffer: Buffer.from('docx content'),
      } as any;

      (axios.post as jest.Mock).mockRejectedValue(
        new Error('Connection refused'),
      );

      await expect(service.extractText(mockFile)).rejects.toThrow(
        'OCR Service Error',
      );
    });
  });
});
