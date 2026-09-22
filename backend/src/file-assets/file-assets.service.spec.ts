import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FileAssetsService } from './file-assets.service';
import { FileAsset } from './entities/file-asset.entity';
import { FileLink } from './entities/file-link.entity';
import { EvidenceVerification } from './entities/evidence-verification.entity';
import { StorageService } from '../common/storage/storage.service';

describe('FileAssetsService', () => {
  let service: FileAssetsService;

  const mockAssetRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((asset) => Promise.resolve({ id: 10, ...asset })),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
  };

  const mockLinkRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((link) => Promise.resolve({ id: 100, ...link })),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockVerifRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((verif) => Promise.resolve({ id: 1, ...verif })),
  };

  const mockStorageService = {
    calculateChecksum: jest.fn().mockReturnValue('mock-sha256-hash-123456'),
    saveFile: jest.fn().mockResolvedValue({
      storedName: 'uuid-123.pdf',
      filePath: '/uploads/file-assets/uuid-123.pdf',
      fileUrl: '/uploads/file-assets/uuid-123.pdf',
      size: 2048,
      checksum: 'mock-sha256-hash-123456',
    }),
    fileExists: jest.fn().mockReturnValue(true),
    getFileStream: jest.fn().mockReturnValue('mock-read-stream' as any),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileAssetsService,
        { provide: getRepositoryToken(FileAsset), useValue: mockAssetRepo },
        { provide: getRepositoryToken(FileLink), useValue: mockLinkRepo },
        {
          provide: getRepositoryToken(EvidenceVerification),
          useValue: mockVerifRepo,
        },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<FileAssetsService>(FileAssetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadAndLinkFile', () => {
    it('should create new FileAsset and FileLink when file is new', async () => {
      mockAssetRepo.findOne.mockResolvedValue(null);

      const mockFile = {
        originalname: 'test-evidence.pdf',
        mimetype: 'application/pdf',
        size: 2048,
        buffer: Buffer.from('test pdf content'),
      };

      const result = await service.uploadAndLinkFile(
        mockFile,
        'WorkingPaper',
        42,
        'evidence',
        'Bằng chứng kiểm tra mẫu',
        {},
        1,
      );

      expect(mockStorageService.calculateChecksum).toHaveBeenCalledWith(
        mockFile.buffer,
      );
      expect(mockStorageService.saveFile).toHaveBeenCalledWith(
        'file-assets',
        'test-evidence.pdf',
        mockFile.buffer,
      );
      expect(mockAssetRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          originalName: 'test-evidence.pdf',
          checksum: 'mock-sha256-hash-123456',
        }),
      );
      expect(mockLinkRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerType: 'WorkingPaper',
          ownerId: 42,
          relationType: 'evidence',
        }),
      );
      expect(mockVerifRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fileLinkId: 100,
          status: 'Pending',
        }),
      );
      expect(result.asset.id).toBe(10);
      expect(result.link.id).toBe(100);
    });

    it('should reuse existing FileAsset (Deduplication) if checksum matches and file exists', async () => {
      const existingAsset = {
        id: 99,
        storageKey: '/uploads/file-assets/existing.pdf',
        checksum: 'mock-sha256-hash-123456',
      };
      mockAssetRepo.findOne.mockResolvedValue(existingAsset);

      const mockFile = {
        originalname: 'duplicate-evidence.pdf',
        mimetype: 'application/pdf',
        size: 2048,
        buffer: Buffer.from('duplicate content'),
      };

      const result = await service.uploadAndLinkFile(
        mockFile,
        'AuditFinding',
        88,
        'attachment',
      );

      // KHÔNG gọi saveFile vật lý vì đã có asset
      expect(mockStorageService.saveFile).not.toHaveBeenCalled();
      expect(mockAssetRepo.save).not.toHaveBeenCalled();

      // Nhưng VẪN tạo FileLink trỏ đến existingAsset.id
      expect(mockLinkRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fileAssetId: 99,
          ownerType: 'AuditFinding',
          ownerId: 88,
        }),
      );
      expect(result.asset.id).toBe(99);
      expect(result.link.id).toBe(100);
    });
  });

  describe('findLinksByOwner', () => {
    it('should query linkRepo with ownerType and ownerId', async () => {
      mockLinkRepo.find.mockResolvedValue([{ id: 1, ownerType: 'WorkingPaper', ownerId: 42 }]);

      const result = await service.findLinksByOwner('WorkingPaper', 42);

      expect(mockLinkRepo.find).toHaveBeenCalledWith({
        where: { ownerType: 'WorkingPaper', ownerId: 42 },
        relations: ['fileAsset', 'verifications'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('verifyEvidence', () => {
    it('should create verification record for given file link', async () => {
      mockLinkRepo.findOne.mockResolvedValue({ id: 100, ownerType: 'Recommendation', ownerId: 5 });

      const result = await service.verifyEvidence(
        100,
        { status: 'Verified', result: 'Bằng chứng hợp lệ đầy đủ đối soát' },
        77,
      );

      expect(mockVerifRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fileLinkId: 100,
          status: 'Verified',
          verifiedById: 77,
        }),
      );
      expect(result.status).toBe('Verified');
    });
  });
});
