import type { ReadStream } from 'fs';

export interface StoredFileInfo {
  storedName: string;
  filePath: string;
  fileUrl: string;
  size: number;
  checksum: string;
}

export interface IStorageService {
  saveFile(
    subDir: string,
    originalName: string,
    buffer: Buffer,
  ): Promise<StoredFileInfo>;
  readFile(filePath: string): Promise<Buffer>;
  deleteFile(filePath: string): Promise<boolean>;
  fileExists(filePath: string): boolean;
  getDirectory(subDir?: string): string;
  calculateChecksum(buffer: Buffer): string;
  getFileStream(filePath: string): ReadStream;
}
