import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditTasksService } from './audit-tasks.service';
import { AuditTask } from './entities/audit-task.entity';

describe('AuditTasksService', () => {
  let service: AuditTasksService;
  let repo: any;

  beforeEach(async () => {
    const mockQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    repo = {
      create: jest.fn((dto) => ({ ...dto, id: 1 })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => mockQb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditTasksService,
        { provide: getRepositoryToken(AuditTask), useValue: repo },
      ],
    }).compile();

    service = module.get<AuditTasksService>(AuditTasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('CRUD methods', () => {
    it('should create audit task', async () => {
      const dto = { title: 'Kiểm tra hồ sơ', engagementId: 10 };
      const res = await service.create(dto);
      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(repo.save).toHaveBeenCalled();
      expect(res.id).toBe(1);
    });

    it('should find task by id', async () => {
      repo.findOne.mockResolvedValue({ id: 1, title: 'Task 1' });
      const res = await service.findOne(1);
      expect(res?.title).toBe('Task 1');
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should update task', async () => {
      await service.update(1, { status: 'Completed' });
      expect(repo.update).toHaveBeenCalledWith(1, { status: 'Completed' });
    });

    it('should remove task', async () => {
      await service.remove(1);
      expect(repo.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('findAll', () => {
    it('should filter by engagementId, departmentId, and year', async () => {
      const qb = repo.createQueryBuilder();
      await service.findAll(undefined, 10, 'CN_HN', '2026');

      expect(qb.andWhere).toHaveBeenCalledWith(
        'task.engagementId = :engagementId',
        { engagementId: 10 },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'eng.legacyAuditedDepartment = :departmentId',
        { departmentId: 'CN_HN' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('plan.year = :year', {
        year: 2026,
      });
    });

    it('should scope auditee users to their audited department', async () => {
      const qb = repo.createQueryBuilder();
      const auditeeUser = {
        role: 'Đơn vị được kiểm toán',
        legacyDepartment: 'Chi nhánh Hà Nội',
      };

      await service.findAll(auditeeUser);
      expect(qb.andWhere).toHaveBeenCalledWith(
        'eng.legacyAuditedDepartment = :dept',
        { dept: 'Chi nhánh Hà Nội' },
      );
    });

    it('should scope auditor users to engagements they participate in', async () => {
      const qb = repo.createQueryBuilder();
      const auditorUser = {
        userId: 5,
        role: 'Auditor',
        teamCode: 'TEAM_A',
      };

      await service.findAll(auditorUser);
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('eng.leadAuditorId = :userId'),
        expect.objectContaining({ userId: 5, team: 'TEAM_A' }),
      );
    });
  });
});
