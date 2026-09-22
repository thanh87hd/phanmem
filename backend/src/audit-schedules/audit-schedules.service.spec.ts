import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditSchedulesService } from './audit-schedules.service';
import { AuditSchedule } from './entities/audit-schedule.entity';
import { User } from '../users/entities/user.entity';

describe('AuditSchedulesService', () => {
  let service: AuditSchedulesService;
  let repo: any;
  let userRepo: any;

  beforeEach(async () => {
    const mockQb = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    repo = {
      create: jest.fn((dto) => ({ ...dto, id: 1 })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      findOneBy: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => mockQb),
    };

    userRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditSchedulesService,
        { provide: getRepositoryToken(AuditSchedule), useValue: repo },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get<AuditSchedulesService>(AuditSchedulesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create, findOne, update, remove', () => {
    it('should create schedule', async () => {
      const dto = { engagementName: 'Audit Q1', startDate: '2026-03-01' };
      const res = await service.create(dto);
      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(repo.save).toHaveBeenCalled();
      expect(res.id).toBe(1);
    });

    it('should find one by id', async () => {
      repo.findOneBy.mockResolvedValue({ id: 1, engagementName: 'Audit Q1' });
      const res = await service.findOne(1);
      expect(res?.id).toBe(1);
      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('should update schedule', async () => {
      await service.update(1, { role: 'Lead' });
      expect(repo.update).toHaveBeenCalledWith(1, { role: 'Lead' });
    });

    it('should remove schedule', async () => {
      await service.remove(1);
      expect(repo.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('findAll with role segregation', () => {
    it('should allow Admin to view all schedules without filter', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 1,
        jobTitle: 'Quản trị hệ thống',
        role: { name: 'Admin' },
      });

      const qb = repo.createQueryBuilder();
      qb.getMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const res = await service.findAll({ userId: 1 });
      expect(res).toHaveLength(2);
      expect(qb.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('s.userId = :currentUserId'),
        expect.anything(),
      );
    });

    it('should restrict regular auditor to view only their own schedules', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 5,
        jobTitle: 'Kiểm toán viên',
        role: { name: 'Auditor' },
      });

      const qb = repo.createQueryBuilder();
      await service.findAll({ userId: 5 });

      expect(qb.andWhere).toHaveBeenCalledWith('s.userId = :currentUserId', {
        currentUserId: 5,
      });
    });

    it('should restrict team lead to their team schedules', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 10,
        jobTitle: 'Trưởng nhóm Kiểm toán',
        teamCode: 'TEAM_CREDIT',
        role: { name: 'LeadAuditor' },
      });

      const qb = repo.createQueryBuilder();
      await service.findAll({ userId: 10 });

      expect(qb.andWhere).toHaveBeenCalledWith('s.teamCode = :userTeam', {
        userTeam: 'TEAM_CREDIT',
      });
    });

    it('should filter by month when provided', async () => {
      const qb = repo.createQueryBuilder();
      await service.findAll(undefined, { month: '2026-05' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        's.startDate <= :end AND s.endDate >= :start',
        { start: '2026-05-01', end: '2026-05-31' },
      );
    });
  });
});
