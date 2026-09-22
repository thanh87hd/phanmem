import * as fs from 'fs';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EvidencesService } from './evidences.service';
import { Evidence } from './entities/evidence.entity';
import { AiService } from '../ai/ai.service';

jest.mock('fs');

describe('EvidencesService', () => {
  let service: EvidencesService;
  let repo: any;
  let recRepo: any;
  let aiService: any;

  beforeEach(async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);

    recRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    repo = {
      create: jest.fn((dto) => ({ ...dto, id: 1 })),
      save: jest.fn((entity) =>
        Promise.resolve({ ...entity, id: entity.id || 1 }),
      ),
      find: jest.fn().mockResolvedValue([]),
      findOneBy: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      manager: {
        getRepository: jest.fn((entityName: string) => {
          if (entityName === 'Recommendation') return recRepo;
          return null;
        }),
      },
    };

    aiService = {
      verifyEvidenceDetails: jest.fn().mockResolvedValue({
        status: 'Verified',
        analysis: 'Bằng chứng hợp lệ và đầy đủ',
        estimatedProgress: 100,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvidencesService,
        { provide: getRepositoryToken(Evidence), useValue: repo },
        { provide: AiService, useValue: aiService },
      ],
    }).compile();

    service = module.get<EvidencesService>(EvidencesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should save file to disk and record evidence entity in DB', async () => {
      const file = {
        originalname: 'chung_tu_thu.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('dummy data'),
      };

      const result = await service.uploadFile(
        file,
        'working_papers',
        10,
        'Bằng chứng thu thập',
        1,
        'Auditor User',
      );

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(repo.create).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
      expect(result.originalName).toBe('chung_tu_thu.pdf');
    });
  });

  describe('verifyEvidenceWithAI', () => {
    it('should mark as unverified if linked resource is not recommendations', async () => {
      repo.findOneBy.mockResolvedValue({
        id: 1,
        linkedResource: 'working_papers',
      });

      const result = await service.verifyEvidenceWithAI(1);
      expect(result.aiVerificationStatus).toBe('Unverified');
    });

    it('should verify evidence with AI and update linked recommendation', async () => {
      repo.findOneBy.mockResolvedValue({
        id: 2,
        linkedResource: 'recommendations',
        linkedResourceId: 50,
        originalName: 'qd_ban_hanh.pdf',
        description: 'Quyết định ban hành quy trình',
      });

      recRepo.findOne.mockResolvedValue({
        id: 50,
        recommendation: 'Ban hành quy trình phê duyệt rủi ro',
        progressPercent: 20,
      });

      const result = await service.verifyEvidenceWithAI(2);
      expect(result.aiVerificationStatus).toBe('Verified');
      expect(recRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Completed',
          progressPercent: 100,
        }),
      );
    });
  });

  describe('queries and remove', () => {
    it('should find by resource', async () => {
      repo.find.mockResolvedValue([{ id: 1 }]);
      const results = await service.findByResource('recommendations', 5);
      expect(results).toHaveLength(1);
      expect(repo.find).toHaveBeenCalledWith({
        where: { linkedResource: 'recommendations', linkedResourceId: 5 },
        order: { uploadedAt: 'DESC' },
      });
    });

    it('should throw NotFoundException if evidence not found', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('should delete file from disk and remove from db', async () => {
      repo.findOneBy.mockResolvedValue({
        id: 1,
        path: '/uploads/evidences/test.pdf',
      });
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = await service.remove(1);
      expect(fs.unlinkSync).toHaveBeenCalledWith('/uploads/evidences/test.pdf');
      expect(repo.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual({ success: true });
    });
  });
});
