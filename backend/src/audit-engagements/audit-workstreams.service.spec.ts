import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { AuditWorkstreamsService } from './audit-workstreams.service';
import { AuditWorkstream } from './entities/audit-workstream.entity';
import { AuditEngagement } from './entities/audit-engagement.entity';
import { AuditReviewNotesService } from '../working-papers/audit-review-notes.service';

describe('AuditWorkstreamsService', () => {
  let service: AuditWorkstreamsService;
  let workstreamRepo: any;
  let engagementRepo: any;
  let reviewNotesService: any;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([
      { id: 1, name: 'Phân hệ Tín dụng', engagementId: 100 },
    ]),
  };

  beforeEach(async () => {
    workstreamRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    engagementRepo = {
      findOne: jest.fn(),
    };

    reviewNotesService = {
      assertCanSignOff: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditWorkstreamsService,
        {
          provide: getRepositoryToken(AuditWorkstream),
          useValue: workstreamRepo,
        },
        {
          provide: getRepositoryToken(AuditEngagement),
          useValue: engagementRepo,
        },
        {
          provide: AuditReviewNotesService,
          useValue: reviewNotesService,
        },
      ],
    }).compile();

    service = module.get<AuditWorkstreamsService>(AuditWorkstreamsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findWorkstreams', () => {
    it('should return workstreams for admin user', async () => {
      const result = await service.findWorkstreams(100, { role: 'admin', userId: 99 });
      expect(result).toBeDefined();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('ws.engagementId = :engagementId', { engagementId: 100 });
    });

    it('should filter by assignedAuditorId or reviewerId for regular auditor', async () => {
      engagementRepo.findOne.mockResolvedValue({ id: 100, leadAuditorId: 50 });
      const result = await service.findWorkstreams(100, { role: 'auditor', userId: 10 });
      expect(result).toBeDefined();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(ws.assignedAuditorId = :userId OR ws.reviewerId = :userId)',
        { userId: 10 },
      );
    });
  });

  describe('createWorkstream', () => {
    it('should allow admin or lead auditor to create workstream', async () => {
      engagementRepo.findOne.mockResolvedValue({ id: 100, leadAuditorId: 10 });
      const dto = { name: 'Phân hệ Kế toán' };
      const res = await service.createWorkstream(100, dto, { role: 'lead_auditor', userId: 10 });
      expect(res.name).toBe('Phân hệ Kế toán');
      expect(res.status).toBe('Draft');
    });

    it('should throw ForbiddenException if user is not lead auditor or admin', async () => {
      engagementRepo.findOne.mockResolvedValue({ id: 100, leadAuditorId: 10 });
      await expect(
        service.createWorkstream(100, { name: 'Test' }, { role: 'auditor', userId: 99 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('completeWorkstream', () => {
    it('should allow assigned auditor to complete workstream', async () => {
      workstreamRepo.findOne
        .mockResolvedValueOnce({ id: 1, assignedAuditorId: 10, status: 'InProgress' })
        .mockResolvedValueOnce({ id: 1, assignedAuditorId: 10, status: 'Completed' });

      const res = await service.completeWorkstream(1, { role: 'auditor', userId: 10 });
      expect(workstreamRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({ status: 'Completed' }));
      expect(res?.status).toBe('Completed');
    });

    it('should reject if another auditor attempts to complete', async () => {
      workstreamRepo.findOne.mockResolvedValue({ id: 1, assignedAuditorId: 10 });
      await expect(
        service.completeWorkstream(1, { role: 'auditor', userId: 20 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reviewWorkstream & Quality Gate', () => {
    it('should enforce assertCanSignOff when reviewing workstream as Reviewed', async () => {
      workstreamRepo.findOne
        .mockResolvedValueOnce({ id: 1, engagementId: 100 })
        .mockResolvedValueOnce({ id: 1, status: 'Reviewed' });
      engagementRepo.findOne.mockResolvedValue({ id: 100, leadAuditorId: 5 });

      await service.reviewWorkstream(1, { status: 'Reviewed' }, { role: 'admin', userId: 1 });
      expect(reviewNotesService.assertCanSignOff).toHaveBeenCalledWith(undefined, 1);
      expect(workstreamRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({ status: 'Reviewed' }));
    });

    it('should fail if assertCanSignOff rejects due to OPEN review notes', async () => {
      workstreamRepo.findOne.mockResolvedValue({ id: 1, engagementId: 100 });
      engagementRepo.findOne.mockResolvedValue({ id: 100, leadAuditorId: 5 });
      reviewNotesService.assertCanSignOff.mockRejectedValue(
        new BadRequestException('Còn điểm soát xét chưa đóng'),
      );

      await expect(
        service.reviewWorkstream(1, { status: 'Reviewed' }, { role: 'admin', userId: 1 }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
