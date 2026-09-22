import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Document } from './entities/document.entity';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('uuid', () => ({ v4: () => '1234-uuid' }));

describe('DocumentsService (TDD)', () => {
  let service: DocumentsService;

  const mockDocRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((doc) => Promise.resolve({ id: 1, ...doc })),
    find: jest.fn(),
    findOneBy: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock fs.existsSync for the constructor
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: getRepositoryToken(Document), useValue: mockDocRepo },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should save file to disk and store entity in DB', async () => {
      // Arrange
      const mockFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('dummy pdf content'),
      } as any;

      // Act
      const result = await service.uploadFile(
        mockFile,
        'Invoice',
        'Finance',
        'Audit',
        1,
        99,
        'ducth',
      );

      // Assert
      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('1234-uuid.pdf'),
        mockFile.buffer,
      );

      expect(mockDocRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          originalName: 'test.pdf',
          storedName: '1234-uuid.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          documentType: 'Invoice',
          category: 'Finance',
          uploadedBy: 99,
          uploadedByName: 'ducth',
        }),
      );
      expect(mockDocRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toHaveProperty('id', 1);
    });
  });

  describe('getFileStream', () => {
    it('should return read stream and doc if file exists on disk', async () => {
      mockDocRepo.findOneBy.mockResolvedValue({
        id: 1,
        path: '/fake/path/1234-uuid.pdf',
        originalName: 'report.pdf',
        mimeType: 'application/pdf',
      });
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.createReadStream as jest.Mock).mockReturnValue('mock-stream' as any);

      const result = await service.getFileStream(1);
      expect(result.stream).toBe('mock-stream');
      expect(result.doc.originalName).toBe('report.pdf');
    });

    it('should throw NotFoundException if file does not exist on disk', async () => {
      mockDocRepo.findOneBy.mockResolvedValue({
        id: 1,
        path: '/fake/path/missing.pdf',
      });
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(service.getFileStream(1)).rejects.toThrow(
        'File không tồn tại trên server',
      );
    });
  });

  describe('remove', () => {
    it('should delete file from disk and entity from DB', async () => {
      // Arrange
      mockDocRepo.findOneBy.mockResolvedValue({
        id: 1,
        path: '/fake/path/1234-uuid.pdf',
      });
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Act
      const result = await service.remove(1);

      // Assert
      expect(fs.unlinkSync).toHaveBeenCalledWith('/fake/path/1234-uuid.pdf');
      expect(mockDocRepo.delete).toHaveBeenCalledWith(1);
      expect(result.success).toBe(true);
    });

    it('should not throw if file does not exist on disk', async () => {
      // Arrange
      mockDocRepo.findOneBy.mockResolvedValue({
        id: 1,
        path: '/fake/path/missing.pdf',
      });
      (fs.existsSync as jest.Mock).mockReturnValue(false); // file missing

      // Act
      const result = await service.remove(1);

      // Assert
      expect(fs.unlinkSync).not.toHaveBeenCalled();
      expect(mockDocRepo.delete).toHaveBeenCalledWith(1);
      expect(result.success).toBe(true);
    });
  });
});
