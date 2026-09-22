import {
  Injectable,
  NotFoundException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Evidence } from './entities/evidence.entity';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AiService } from '../ai/ai.service';
import { StorageService } from '../common/storage/storage.service';
import { FileAssetsService } from '../file-assets/file-assets.service';

@Injectable()
export class EvidencesService {
  private readonly logger = new Logger(EvidencesService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'evidences');

  constructor(
    @InjectRepository(Evidence)
    private readonly repo: Repository<Evidence>,
    private readonly aiService: AiService,
    @Optional()
    private readonly storageService?: StorageService,
    @Optional()
    private readonly fileAssetsService?: FileAssetsService,
  ) {
    // Tạo thư mục nếu chưa tồn tại
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(
    file: any,
    linkedResource: string,
    linkedResourceId: number,
    description: string,
    uploadedBy: number,
    uploadedByName: string,
  ): Promise<Evidence> {
    let storedName: string;
    let filePath: string;

    if (this.storageService) {
      const saved = await this.storageService.saveFile(
        'evidences',
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

    const evidence = this.repo.create({
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      size: file.size,
      path: filePath,
      linkedResource,
      linkedResourceId,
      description,
      uploadedBy,
      uploadedByName,
      version: 1,
    });

    const saved = await this.repo.save(evidence);

    // Compatibility Facade Dual-Write sang FileAssets (ADR-0009)
    if (this.fileAssetsService) {
      try {
        await this.fileAssetsService.uploadAndLinkFile(
          file,
          linkedResource || 'Evidence',
          linkedResourceId || saved.id,
          'evidence',
          description,
          {
            legacyTable: 'evidences',
            legacyId: saved.id,
            uploadedByName,
            version: 1,
          },
          uploadedBy,
        );
      } catch (err) {
        this.logger.warn(
          `[EvidencesService Facade] Không thể đồng bộ sang file_assets: ${err.message}`,
        );
      }
    }

    // Tự động kiểm tra và thẩm định bằng chứng qua AI ở background
    if (linkedResource === 'recommendations') {
      setTimeout(() => {
        this.verifyEvidenceWithAI(saved.id).catch((err) => {
          this.logger.error(
            '[Smart Evidences Verifier] Lỗi kiểm định background:',
            err,
          );
        });
      }, 100);
    }

    return saved;
  }

  async verifyEvidenceWithAI(id: number): Promise<Evidence> {
    const evidence = await this.findOne(id);
    if (evidence.linkedResource !== 'recommendations') {
      evidence.aiVerificationStatus = 'Unverified';
      evidence.aiVerificationResult =
        'Tài liệu không thuộc loại Kiến nghị cần thẩm định tự động.';
      return this.repo.save(evidence);
    }

    const rec = (await this.repo.manager
      .getRepository('Recommendation')
      .findOne({
        where: { id: evidence.linkedResourceId },
      })) as any;

    if (!rec) {
      evidence.aiVerificationStatus = 'Rejected';
      evidence.aiVerificationResult =
        'Không tìm thấy Kiến nghị liên kết với bằng chứng này.';
      return this.repo.save(evidence);
    }

    try {
      evidence.aiVerificationStatus = 'Pending';
      await this.repo.save(evidence);

      // Gọi AI Service thẩm định chi tiết
      const result = await this.aiService.verifyEvidenceDetails({
        fileName: evidence.originalName,
        description: evidence.description || '',
        recommendation: rec.recommendation,
      });

      evidence.aiVerificationStatus = result.status; // Verified | Rejected
      evidence.aiVerificationResult = result.analysis;

      if (result.status === 'Verified') {
        rec.progressPercent = Math.max(
          rec.progressPercent || 0,
          result.estimatedProgress || 100,
        );
        if (rec.progressPercent >= 100) {
          rec.status = 'Completed';
          rec.closureStatus = 'PendingKTNBReview';
          rec.completedAt = new Date();
        } else {
          rec.status = 'InProgress';
        }
        await this.repo.manager.getRepository('Recommendation').save(rec);
      }

      return this.repo.save(evidence);
    } catch (e) {
      evidence.aiVerificationStatus = 'Pending';
      evidence.aiVerificationResult = `Lỗi hệ thống trong quá trình thẩm định AI: ${e.message}`;
      return this.repo.save(evidence);
    }
  }

  findByResource(resource: string, resourceId: number) {
    return this.repo.find({
      where: { linkedResource: resource, linkedResourceId: resourceId },
      order: { uploadedAt: 'DESC' },
    });
  }

  findAll() {
    return this.repo.find({ order: { uploadedAt: 'DESC' } });
  }

  async findOne(id: number) {
    const evidence = await this.repo.findOneBy({ id });
    if (!evidence) throw new NotFoundException('Không tìm thấy bằng chứng');
    return evidence;
  }

  async remove(id: number) {
    const evidence = await this.findOne(id);
    // Xóa file trên disk
    if (fs.existsSync(evidence.path)) {
      fs.unlinkSync(evidence.path);
    }
    await this.repo.delete(id);
    return { success: true };
  }
}
