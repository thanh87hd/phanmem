import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { FileAsset } from './entities/file-asset.entity';
import { FileLink } from './entities/file-link.entity';
import { EvidenceVerification } from './entities/evidence-verification.entity';
import { StorageService } from '../common/storage/storage.service';
import { CreateFileLinkDto } from './dto/create-file-link.dto';
import { VerifyEvidenceDto } from './dto/verify-evidence.dto';

@Injectable()
export class FileAssetsService {
  private readonly logger = new Logger(FileAssetsService.name);

  constructor(
    @InjectRepository(FileAsset)
    private readonly assetRepo: Repository<FileAsset>,
    @InjectRepository(FileLink)
    private readonly linkRepo: Repository<FileLink>,
    @InjectRepository(EvidenceVerification)
    private readonly verifRepo: Repository<EvidenceVerification>,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Upload file mới và tự động gắn link vào Business Entity (ownerType + ownerId).
   * Hỗ trợ Deduplication thông qua mã băm SHA-256 (ADR-0009).
   */
  async uploadAndLinkFile(
    file: any,
    ownerType: string,
    ownerId: number,
    relationType = 'attachment',
    caption?: string,
    metadata: Record<string, any> = {},
    userId?: number,
  ): Promise<{ asset: FileAsset; link: FileLink }> {
    if (!file || !file.buffer) {
      throw new BadRequestException('File không hợp lệ hoặc rỗng');
    }

    const checksum = this.storageService.calculateChecksum(file.buffer);

    // 1. Kiểm tra xem file asset với checksum này đã tồn tại chưa
    let asset = await this.assetRepo.findOne({ where: { checksum } });

    if (asset && this.storageService.fileExists(asset.storageKey)) {
      this.logger.log(
        `[Deduplication] Tái sử dụng file_asset id=${asset.id} cho checksum=${checksum.substring(0, 12)}...`,
      );
    } else {
      // Lưu file vật lý mới vào storage
      const savedInfo = await this.storageService.saveFile(
        'file-assets',
        file.originalname,
        file.buffer,
      );

      asset = this.assetRepo.create({
        storageKey: savedInfo.filePath,
        originalName: file.originalname,
        mimeType: file.mimetype || 'application/octet-stream',
        size: file.size || file.buffer.length,
        checksum,
        uploadedById: userId,
      });

      asset = await this.assetRepo.save(asset);
      this.logger.log(
        `[Upload] Đã tạo file_asset mới id=${asset.id}, path=${asset.storageKey}`,
      );
    }

    // 2. Tạo bản ghi FileLink gắn với Business Owner
    const linkMetadata = {
      ...metadata,
      uploaderSnapshot: {
        userId,
        originalName: file.originalname,
        size: file.size || file.buffer.length,
        mimeType: file.mimetype,
        uploadedAt: new Date().toISOString(),
      },
    };

    const link = this.linkRepo.create({
      fileAssetId: asset.id,
      ownerType,
      ownerId,
      relationType: relationType || 'attachment',
      caption: caption || '',
      metadata: linkMetadata,
    });

    const savedLink = await this.linkRepo.save(link);

    // 3. Nếu là bằng chứng kiểm toán (evidence), khởi tạo bản ghi thẩm định
    if (relationType === 'evidence') {
      const verif = this.verifRepo.create({
        fileLinkId: savedLink.id,
        status: 'Pending',
        result: 'Chờ kiểm toán viên/trưởng đoàn thẩm định',
      });
      await this.verifRepo.save(verif);
    }

    return { asset, link: savedLink };
  }

  /**
   * Gắn liên kết một fileAsset đã có sẵn vào một Business Owner mới
   */
  async createLink(
    dto: CreateFileLinkDto,
    userId?: number,
  ): Promise<FileLink> {
    const asset = await this.assetRepo.findOneBy({ id: dto.fileAssetId });
    if (!asset) {
      throw new NotFoundException(`Không tìm thấy file asset id=${dto.fileAssetId}`);
    }

    const linkMetadata = {
      ...(dto.metadata || {}),
      uploaderSnapshot: {
        linkedByUserId: userId,
        linkedAt: new Date().toISOString(),
      },
    };

    const link = this.linkRepo.create({
      fileAssetId: asset.id,
      ownerType: dto.ownerType,
      ownerId: dto.ownerId,
      relationType: dto.relationType || 'attachment',
      caption: dto.caption || '',
      metadata: linkMetadata,
    });

    const savedLink = await this.linkRepo.save(link);

    if (dto.relationType === 'evidence') {
      const verif = this.verifRepo.create({
        fileLinkId: savedLink.id,
        status: 'Pending',
        result: 'Chờ kiểm toán viên/trưởng đoàn thẩm định',
      });
      await this.verifRepo.save(verif);
    }

    return this.findLinkById(savedLink.id);
  }

  /**
   * Lấy danh sách file links theo owner
   */
  async findLinksByOwner(
    ownerType: string,
    ownerId: number,
    relationType?: string,
  ): Promise<FileLink[]> {
    const where: any = { ownerType, ownerId };
    if (relationType) {
      where.relationType = relationType;
    }

    return this.linkRepo.find({
      where,
      relations: ['fileAsset', 'verifications'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Lấy thông tin 1 file link
   */
  async findLinkById(linkId: number): Promise<FileLink> {
    const link = await this.linkRepo.findOne({
      where: { id: linkId },
      relations: ['fileAsset', 'verifications'],
    });
    if (!link) {
      throw new NotFoundException(`Không tìm thấy liên kết file id=${linkId}`);
    }
    return link;
  }

  /**
   * Lấy thông tin 1 file asset
   */
  async findAssetById(assetId: number): Promise<FileAsset> {
    const asset = await this.assetRepo.findOneBy({ id: assetId });
    if (!asset) {
      throw new NotFoundException(`Không tìm thấy file asset id=${assetId}`);
    }
    return asset;
  }

  /**
   * Lấy stream file qua assetId để download
   */
  async getFileStreamByAssetId(
    assetId: number,
  ): Promise<{ stream: fs.ReadStream; asset: FileAsset }> {
    const asset = await this.findAssetById(assetId);
    if (!this.storageService.fileExists(asset.storageKey)) {
      throw new NotFoundException('Tệp không tồn tại trên hệ thống lưu trữ');
    }
    return {
      stream: this.storageService.getFileStream(asset.storageKey),
      asset,
    };
  }

  /**
   * Lấy stream file qua linkId để download
   */
  async getFileStreamByLinkId(
    linkId: number,
  ): Promise<{ stream: fs.ReadStream; asset: FileAsset; link: FileLink }> {
    const link = await this.findLinkById(linkId);
    if (!link.fileAsset) {
      throw new NotFoundException('Không tìm thấy thông tin file asset của liên kết');
    }
    if (!this.storageService.fileExists(link.fileAsset.storageKey)) {
      throw new NotFoundException('Tệp không tồn tại trên hệ thống lưu trữ');
    }
    return {
      stream: this.storageService.getFileStream(link.fileAsset.storageKey),
      asset: link.fileAsset,
      link,
    };
  }

  /**
   * Xóa liên kết file (Unlink)
   */
  async removeLink(linkId: number): Promise<{ success: boolean; message: string }> {
    const link = await this.findLinkById(linkId);
    await this.linkRepo.delete(linkId);
    return {
      success: true,
      message: `Đã xóa liên kết file id=${linkId} khỏi ${link.ownerType} id=${link.ownerId}`,
    };
  }

  /**
   * Thẩm định bằng chứng kiểm toán (Evidence Verification)
   */
  async verifyEvidence(
    linkId: number,
    dto: VerifyEvidenceDto,
    verifierUserId?: number,
  ): Promise<EvidenceVerification> {
    const link = await this.findLinkById(linkId);

    const verif = this.verifRepo.create({
      fileLinkId: link.id,
      status: dto.status,
      result: dto.result || '',
      verifiedById: verifierUserId,
      verifiedAt: new Date(),
    });

    return this.verifRepo.save(verif);
  }
}
