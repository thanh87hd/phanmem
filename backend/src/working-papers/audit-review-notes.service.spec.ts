import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AuditReviewNotesService } from './audit-review-notes.service';
import { AuditReviewNote, ReviewNoteStatus } from './entities/audit-review-note.entity';

describe('AuditReviewNotesService', () => {
  let service: AuditReviewNotesService;
  let repo: any;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    repo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditReviewNotesService,
        {
          provide: getRepositoryToken(AuditReviewNote),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<AuditReviewNotesService>(AuditReviewNotesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should generate sequence number and save review note with OPEN status', async () => {
      repo.count.mockResolvedValue(2);
      const dto = {
        engagementId: 10,
        workingPaperId: 5,
        note: 'Cần bổ sung chứng từ giải ngân khoản vay',
      };
      const user = { userId: 99, fullName: 'Trưởng đoàn Nguyễn Văn A' };

      const res = await service.create(dto, user);
      expect(res.reviewSeq).toBe('RN-03');
      expect(res.status).toBe(ReviewNoteStatus.OPEN);
      expect(res.reviewerId).toBe(99);
      expect(repo.save).toHaveBeenCalled();
    });
  });

  describe('respond', () => {
    it('should update auditor response and set status to RESOLVED', async () => {
      const note = {
        id: 1,
        status: ReviewNoteStatus.OPEN,
        note: 'Yêu cầu làm rõ',
      };
      repo.findOne.mockResolvedValue(note);

      const user = { userId: 5, fullName: 'KTV Trần B' };
      const res = await service.respond(1, { response: 'Đã đính kèm phụ lục' }, user);

      expect(res.status).toBe(ReviewNoteStatus.RESOLVED);
      expect(res.auditorResponse).toBe('Đã đính kèm phụ lục');
      expect(res.auditorId).toBe(5);
    });

    it('should throw BadRequestException if note is already CLOSED', async () => {
      repo.findOne.mockResolvedValue({ id: 1, status: ReviewNoteStatus.CLOSED });
      await expect(
        service.respond(1, { response: 'Cố giải trình tiếp' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('close', () => {
    it('should set status to CLOSED and record closedBy', async () => {
      const note = {
        id: 1,
        status: ReviewNoteStatus.RESOLVED,
      };
      repo.findOne.mockResolvedValue(note);

      const user = { userId: 99 };
      const res = await service.close(1, user);

      expect(res.status).toBe(ReviewNoteStatus.CLOSED);
      expect(res.closedById).toBe(99);
      expect(res.closedAt).toBeDefined();
    });
  });

  describe('assertCanSignOff (IIA 1311 Quality Gate)', () => {
    it('should pass silently if no open notes exist', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      await expect(service.assertCanSignOff(10, undefined)).resolves.not.toThrow();
    });

    it('should throw BadRequestException if open review notes exist', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([
        { id: 1, reviewSeq: 'RN-01', status: ReviewNoteStatus.OPEN },
      ]);

      await expect(service.assertCanSignOff(10, undefined)).rejects.toThrow(BadRequestException);
    });
  });
});
