import { Injectable, NotFoundException, Optional, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from '../common/storage/storage.service';
import { FileAssetsService } from '../file-assets/file-assets.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'documents');

  constructor(
    @InjectRepository(Document)
    private readonly docRepo: Repository<Document>,
    @Optional()
    private readonly storageService?: StorageService,
    @Optional()
    private readonly fileAssetsService?: FileAssetsService,
  ) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(
    file: any,
    documentType: string,
    category: string,
    linkedResource?: string,
    linkedResourceId?: number,
    userId?: number,
    username?: string,
  ): Promise<Document> {
    let storedName: string;
    let filePath: string;

    if (this.storageService) {
      const saved = await this.storageService.saveFile(
        'documents',
        file.originalname,
        file.buffer,
      );
      storedName = saved.storedName;
      filePath = saved.filePath;
    } else {
      storedName = `${uuidv4()}${path.extname(file.originalname)}`;
      filePath = path.join(this.uploadDir, storedName);
      fs.writeFileSync(filePath, file.buffer);
    }

    const doc = this.docRepo.create({
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      size: file.size,
      path: filePath,
      documentType: documentType || 'File',
      category: category || '',
      linkedResource,
      linkedResourceId,
      uploadedBy: userId,
      uploadedByName: username,
    });

    const savedDoc = await this.docRepo.save(doc);

    // Compatibility Facade Dual-Write sang FileAssets (ADR-0009)
    if (this.fileAssetsService) {
      try {
        await this.fileAssetsService.uploadAndLinkFile(
          file,
          linkedResource || 'Document',
          linkedResourceId || savedDoc.id,
          documentType || 'File',
          category,
          {
            legacyTable: 'documents',
            legacyId: savedDoc.id,
            uploadedByName: username,
            category,
          },
          userId,
        );
      } catch (err) {
        this.logger.warn(
          `[DocumentsService Facade] Không thể đồng bộ sang file_assets: ${err.message}`,
        );
      }
    }

    return savedDoc;
  }

  findAll(filters?: { linkedResource?: string; linkedResourceId?: number }) {
    return this.docRepo.find({
      where: filters,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const doc = await this.docRepo.findOneBy({ id });
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu');
    return doc;
  }

  async getFileStream(
    id: number,
  ): Promise<{ stream: fs.ReadStream; doc: Document }> {
    const doc = await this.findOne(id);
    if (!fs.existsSync(doc.path)) {
      throw new NotFoundException('File không tồn tại trên server');
    }
    return {
      stream: fs.createReadStream(doc.path),
      doc,
    };
  }

  async remove(id: number) {
    const doc = await this.findOne(id);
    if (fs.existsSync(doc.path)) {
      fs.unlinkSync(doc.path);
    }
    await this.docRepo.delete(id);
    return { success: true };
  }
}
