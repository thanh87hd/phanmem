import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { IStorageService, StoredFileInfo } from './storage.interface';

@Injectable()
export class StorageService implements IStorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly baseUploadDir: string;

  constructor() {
    this.baseUploadDir = process.env.STORAGE_PATH
      ? path.resolve(process.env.STORAGE_PATH)
      : path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.baseUploadDir)) {
      fs.mkdirSync(this.baseUploadDir, { recursive: true });
    }
  }

  getDirectory(subDir = ''): string {
    const targetDir = subDir
      ? path.join(this.baseUploadDir, subDir)
      : this.baseUploadDir;
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    return targetDir;
  }

  calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  async saveFile(
    subDir: string,
    originalName: string,
    buffer: Buffer,
  ): Promise<StoredFileInfo> {
    const dir = this.getDirectory(subDir);
    const ext = path.extname(originalName) || '';
    const storedName = `${uuidv4()}${ext}`;
    const filePath = path.join(dir, storedName);

    await fs.promises.writeFile(filePath, buffer);

    const checksum = this.calculateChecksum(buffer);
    const relativeSub = subDir ? `${subDir.replace(/\\/g, '/')}/` : '';
    const fileUrl = `/uploads/${relativeSub}${storedName}`;

    return {
      storedName,
      filePath,
      fileUrl,
      size: buffer.length,
      checksum,
    };
  }

  async readFile(filePath: string): Promise<Buffer> {
    return fs.promises.readFile(filePath);
  }

  getFileStream(filePath: string): fs.ReadStream {
    return fs.createReadStream(filePath);
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
      return false;
    } catch (err) {
      this.logger.warn(`Could not delete file at ${filePath}: ${err}`);
      return false;
    }
  }

  fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }
}
