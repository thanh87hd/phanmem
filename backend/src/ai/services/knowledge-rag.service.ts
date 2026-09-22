import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegulatoryKnowledge } from '../entities/regulatory-knowledge.entity';
import { FindingKnowledge } from '../entities/finding-knowledge.entity';
import { DocumentChunk } from '../entities/document-chunk.entity';
import { ExtractionService } from '../../extraction/extraction.service';
import { OllamaService } from '../ollama.service';

export interface RegulatoryChunkMatch {
  chunkId: number;
  regulatoryKnowledgeId: number;
  documentCode: string;
  documentTitle: string;
  documentType: string;
  businessProcess: string;
  heading?: string;
  pageNumber?: number;
  content: string;
}

@Injectable()
export class KnowledgeRagService {
  private readonly logger = new Logger(KnowledgeRagService.name);

  constructor(
    @InjectRepository(RegulatoryKnowledge)
    private readonly regRepo: Repository<RegulatoryKnowledge>,
    @InjectRepository(FindingKnowledge)
    private readonly kbRepo: Repository<FindingKnowledge>,
    @InjectRepository(DocumentChunk)
    private readonly chunkRepo: Repository<DocumentChunk>,
    private readonly extractionService: ExtractionService,
    private readonly ollamaService: OllamaService,
  ) {}

  /**
   * Search regulatory document metadata (backward compatible).
   */
  async searchRegulatory(
    query: string,
    limit = 5,
  ): Promise<RegulatoryKnowledge[]> {
    const qb = this.regRepo.createQueryBuilder('reg');
    if (query && query.trim()) {
      qb.where(
        'reg.title ILIKE :q OR reg.summary ILIKE :q OR reg.code ILIKE :q',
        {
          q: `%${query.trim()}%`,
        },
      );
    }
    return qb.take(limit).getMany();
  }

  /**
   * Precise RAG Search across granular sections/articles (chunks).
   * Returns exact Article / Clause / Heading matches with document context.
   */
  async searchRegulatoryChunks(
    query: string,
    limit = 5,
  ): Promise<RegulatoryChunkMatch[]> {
    if (!query || !query.trim()) {
      return [];
    }

    const trimmed = query.trim();
    const terms = trimmed.split(/\s+/).filter((t) => t.length > 1);

    const qb = this.chunkRepo
      .createQueryBuilder('chunk')
      .innerJoinAndSelect('chunk.regulatoryKnowledge', 'reg')
      .where(
        'chunk.content ILIKE :fullQuery OR chunk.heading ILIKE :fullQuery OR reg.title ILIKE :fullQuery OR reg.code ILIKE :fullQuery',
        { fullQuery: `%${trimmed}%` },
      );

    if (terms.length > 1) {
      terms.forEach((term, idx) => {
        qb.orWhere(
          `chunk.content ILIKE :term${idx} OR chunk.heading ILIKE :term${idx}`,
          {
            [`term${idx}`]: `%${term}%`,
          },
        );
      });
    }

    const chunks = await qb.take(limit).getMany();

    return chunks.map((c) => ({
      chunkId: c.id,
      regulatoryKnowledgeId: c.regulatoryKnowledgeId,
      documentCode: c.regulatoryKnowledge?.code || '',
      documentTitle: c.regulatoryKnowledge?.title || '',
      documentType: c.regulatoryKnowledge?.type || '',
      businessProcess: c.regulatoryKnowledge?.businessProcess || 'Chung',
      heading: c.heading,
      pageNumber: c.pageNumber,
      content: c.content,
    }));
  }

  async searchFindingKnowledge(
    query: string,
    limit = 5,
  ): Promise<FindingKnowledge[]> {
    const qb = this.kbRepo.createQueryBuilder('kb');
    if (query && query.trim()) {
      qb.where(
        'kb.title ILIKE :q OR kb.defectDescription ILIKE :q OR kb.defectCode ILIKE :q',
        {
          q: `%${query.trim()}%`,
        },
      );
    }
    return qb.take(limit).getMany();
  }
}
