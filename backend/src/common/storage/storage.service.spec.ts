import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';
import * as fs from 'fs';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageService],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create base upload directory and subdirectories', () => {
    const dir = service.getDirectory('test-sub');
    expect(dir).toContain('test-sub');
    expect(fs.existsSync(dir)).toBe(true);

    // Clean up
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('should save, read, check existence, and delete a file', async () => {
    const content = Buffer.from('hello storage test');
    const result = await service.saveFile('test-temp', 'example.txt', content);

    expect(result.storedName).toBeDefined();
    expect(result.size).toBe(content.length);
    expect(result.fileUrl).toContain('/uploads/test-temp/');
    expect(service.fileExists(result.filePath)).toBe(true);

    const read = await service.readFile(result.filePath);
    expect(read.toString()).toBe('hello storage test');

    const deleted = await service.deleteFile(result.filePath);
    expect(deleted).toBe(true);
    expect(service.fileExists(result.filePath)).toBe(false);

    // Clean up directory
    const dir = service.getDirectory('test-temp');
    if (fs.existsSync(dir)) {
      fs.rmdirSync(dir, { recursive: true });
    }
  });
});
