import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegulatoryKnowledge } from '../entities/regulatory-knowledge.entity';
import { DocumentChunk } from '../entities/document-chunk.entity';
import { chunkMarkdownDocument } from '../utils/document-chunker';
import { ExtractionService } from '../../extraction/extraction.service';
import * as fs from 'fs';
import * as path from 'path';

export interface RegulatoryUploadJob {
  status: 'processing' | 'completed' | 'failed';
  total: number;
  processed: number;
  success: number;
  failed: number;
  errors: string[];
}

@Injectable()
export class RegulatoryKnowledgeService {
  private readonly logger = new Logger(RegulatoryKnowledgeService.name);
  private jobTracker = new Map<string, RegulatoryUploadJob>();

  constructor(
    @InjectRepository(RegulatoryKnowledge)
    private readonly regRepo: Repository<RegulatoryKnowledge>,
    @InjectRepository(DocumentChunk)
    private readonly chunkRepo: Repository<DocumentChunk>,
    private readonly extractionService: ExtractionService,
  ) {}

  async getAllRegulatory() {
    return this.regRepo.find({ order: { type: 'ASC', code: 'ASC' } });
  }

  async getRegulatoryById(id: number) {
    return this.regRepo.findOne({
      where: { id },
      relations: ['chunks'],
    });
  }

  async getDocumentChunks(regulatoryKnowledgeId: number) {
    return this.chunkRepo.find({
      where: { regulatoryKnowledgeId },
      order: { chunkIndex: 'ASC' },
    });
  }

  private filterRegulatoryColumns(dto: any): Record<string, any> {
    const validColumns = [
      'title',
      'code',
      'type',
      'businessProcess',
      'relatedRisks',
      'summary',
      'fullContent',
      'effectiveDate',
      'status',
      'downloadLink',
      'pageCount',
      'extractionMethod',
      'ocrConfidence',
      'sourceDocumentId',
    ];
    const clean: Record<string, any> = {};
    if (!dto || typeof dto !== 'object') return clean;
    for (const key of validColumns) {
      if (dto[key] !== undefined) {
        clean[key] = dto[key];
      }
    }
    return clean;
  }

  async rechunkDocument(
    regulatoryKnowledgeId: number,
    markdown: string,
  ): Promise<number> {
    if (!regulatoryKnowledgeId) return 0;
    try {
      await this.chunkRepo.delete({ regulatoryKnowledgeId });
      if (!markdown || !markdown.trim()) return 0;

      const generatedChunks = chunkMarkdownDocument(markdown);
      if (generatedChunks.length === 0) return 0;

      const entities = generatedChunks.map((c) =>
        this.chunkRepo.create({
          regulatoryKnowledgeId,
          chunkIndex: c.chunkIndex,
          content: c.content,
          heading: (c.heading || '').substring(0, 490),
          pageNumber: c.pageNumber,
          charCount: c.charCount,
        }),
      );

      for (let i = 0; i < entities.length; i += 50) {
        await this.chunkRepo.save(entities.slice(i, i + 50));
      }
      this.logger.log(
        `Tạo thành công ${entities.length} chunks cho văn bản id=${regulatoryKnowledgeId}`,
      );
      return entities.length;
    } catch (err: any) {
      this.logger.error(
        `Lỗi chunk văn bản id=${regulatoryKnowledgeId}: ${err.message}`,
      );
      return 0;
    }
  }

  async createRegulatory(dto: any): Promise<RegulatoryKnowledge> {
    const cleanDto = this.filterRegulatoryColumns(dto);

    // Nếu văn bản với mã code này đã tồn tại, tự động cập nhật thay vì tạo trùng lặp
    if (
      cleanDto.code &&
      typeof cleanDto.code === 'string' &&
      cleanDto.code.trim()
    ) {
      const existing = await this.regRepo.findOne({
        where: { code: cleanDto.code.trim() },
      });
      if (existing) {
        this.logger.log(
          `Văn bản với mã "${cleanDto.code}" đã tồn tại (id=${existing.id}), tiến hành cập nhật nội dung markdown.`,
        );
        const updated = await this.updateRegulatory(existing.id, cleanDto);
        return updated || existing;
      }
    }

    const item = this.regRepo.create(cleanDto as Partial<RegulatoryKnowledge>);
    const saved = await this.regRepo.save(item);
    if (saved.fullContent) {
      await this.rechunkDocument(saved.id, saved.fullContent);
    }
    return saved;
  }

  async updateRegulatory(id: number, dto: any) {
    const cleanDto = this.filterRegulatoryColumns(dto);
    if (Object.keys(cleanDto).length > 0) {
      await this.regRepo.update(id, cleanDto);
    }
    const updated = await this.regRepo.findOne({ where: { id } });
    if (updated && cleanDto.fullContent !== undefined) {
      await this.rechunkDocument(id, cleanDto.fullContent || '');
    }
    return updated;
  }

  async deleteRegulatory(id: number) {
    await this.regRepo.delete(id);
    return { success: true };
  }

  getJobStatus(jobId: string): RegulatoryUploadJob | { status: 'not_found' } {
    return this.jobTracker.get(jobId) || { status: 'not_found' };
  }

  async processRegulatoryBulkUploadAsync(
    jobId: string,
    files: Array<{
      buffer?: Buffer;
      path?: string;
      originalname: string;
      mimetype?: string;
    }>,
  ) {
    this.jobTracker.set(jobId, {
      status: 'processing',
      total: files.length,
      processed: 0,
      success: 0,
      failed: 0,
      errors: [],
    });

    const job = this.jobTracker.get(jobId)!;

    for (const file of files) {
      try {
        const ext = path.extname(file.originalname).toLowerCase();

        // Use extractFull to get metadata alongside markdown (supports both buffer and path)
        const result = await this.extractionService.extractFull(
          file.buffer ? file : file.path,
        );
        const extractedText = result.markdown;

        const code = path.basename(file.originalname, ext).trim();
        const existing = await this.regRepo.findOne({ where: { code } });

        if (existing) {
          existing.fullContent = extractedText;
          existing.summary =
            extractedText.length > 500
              ? extractedText.substring(0, 500) + '...'
              : extractedText;
          // Update extraction metadata
          existing.pageCount = result.pageCount ?? existing.pageCount;
          existing.extractionMethod =
            result.extractionMethod ?? existing.extractionMethod;
          existing.ocrConfidence = result.confidence ?? existing.ocrConfidence;
          const savedExisting = await this.regRepo.save(existing);
          await this.rechunkDocument(savedExisting.id, extractedText);
        } else {
          const newItem = this.regRepo.create({
            code,
            title: code,
            type: result.category || 'Văn bản Pháp luật / Quy định',
            businessProcess: 'Chung',
            summary:
              extractedText.length > 500
                ? extractedText.substring(0, 500) + '...'
                : extractedText,
            fullContent: extractedText,
            status: 'Còn hiệu lực',
            pageCount: result.pageCount,
            extractionMethod: result.extractionMethod,
            ocrConfidence: result.confidence,
          });
          const savedItem = await this.regRepo.save(newItem);
          await this.rechunkDocument(savedItem.id, extractedText);
        }

        job.success++;
      } catch (err: any) {
        this.logger.error(
          `Lỗi xử lý file ${file.originalname} trong batch upload:`,
          err,
        );
        job.failed++;
        job.errors.push(
          `${file.originalname}: ${err.message || 'Lỗi không xác định'}`,
        );
      } finally {
        job.processed++;
        // Dọn dẹp file tạm nếu có file.path
        try {
          if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch {
          // ignore unlink error
        }
      }
    }

    job.status = 'completed';
  }

  async scanDirectoryForRegulations(directoryPath: string) {
    if (
      !directoryPath ||
      directoryPath.includes('..') ||
      /^[a-zA-Z]:[\\/](windows|winnt|system32)/i.test(directoryPath)
    ) {
      throw new BadRequestException('Bảo mật: Đường dẫn thư mục không hợp lệ.');
    }

    if (!fs.existsSync(directoryPath)) {
      return { success: false, message: 'Thư mục không tồn tại' };
    }

    const files = fs.readdirSync(directoryPath);
    let imported = 0;
    let errors = 0;

    for (const fileName of files) {
      const filePath = path.join(directoryPath, fileName);
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) continue;

      const ext = path.extname(fileName).toLowerCase();
      if (!['.pdf', '.docx', '.doc', '.txt', '.md'].includes(ext)) continue;

      try {
        const result = await this.extractionService.extractFull(filePath);
        const extractedText = result.markdown;

        const code = path.basename(fileName, ext).trim();
        const existing = await this.regRepo.findOne({ where: { code } });

        if (existing) {
          existing.fullContent = extractedText;
          existing.summary =
            extractedText.length > 500
              ? extractedText.substring(0, 500) + '...'
              : extractedText;
          existing.pageCount = result.pageCount ?? existing.pageCount;
          existing.extractionMethod =
            result.extractionMethod ?? existing.extractionMethod;
          existing.ocrConfidence = result.confidence ?? existing.ocrConfidence;
          const savedExisting = await this.regRepo.save(existing);
          await this.rechunkDocument(savedExisting.id, extractedText);
        } else {
          const newItem = this.regRepo.create({
            code,
            title: code,
            type: result.category || 'Văn bản Pháp luật / Quy định',
            businessProcess: 'Chung',
            summary:
              extractedText.length > 500
                ? extractedText.substring(0, 500) + '...'
                : extractedText,
            fullContent: extractedText,
            status: 'Còn hiệu lực',
            pageCount: result.pageCount,
            extractionMethod: result.extractionMethod,
            ocrConfidence: result.confidence,
          });
          const savedItem = await this.regRepo.save(newItem);
          await this.rechunkDocument(savedItem.id, extractedText);
        }
        imported++;
      } catch (err) {
        this.logger.error(`Lỗi import văn bản từ file ${fileName}:`, err);
        errors++;
      }
    }

    return { success: true, imported, errors, total: files.length };
  }
}
