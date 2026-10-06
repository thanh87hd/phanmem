import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditTasksService } from './audit-tasks.service';
import { AuditTask } from './entities/audit-task.entity';
import { TasksService } from '../tasks/tasks.service';

/**
 * AuditTasksService is a compatibility facade (ADR-0010): every operation is delegated
 * to TasksService with sourceType = 'Audit'. The AuditTask repository token is only
 * required to satisfy @InjectRepository(AuditTask) at DI bootstrap -- the facade never
 * touches it, so it is stubbed empty on purpose.
 */
describe('AuditTasksService', () => {
  let service: AuditTasksService;
  let tasksService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    tasksService = {
      create: jest.fn((dto) => Promise.resolve({ id: 1, ...dto })),
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ id: 1, title: 'Task 1' }),
      update: jest.fn((id, dto) => Promise.resolve({ id, ...dto })),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditTasksService,
        { provide: getRepositoryToken(AuditTask), useValue: {} },
        { provide: TasksService, useValue: tasksService },
      ],
    }).compile();

    service = module.get<AuditTasksService>(AuditTasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('CRUD methods', () => {
    it('should create audit task through TasksService with the Audit source type', async () => {
      const dto = { title: 'Kiểm tra hồ sơ', engagementId: 10 };
      const res = await service.create(dto);

      expect(tasksService.create).toHaveBeenCalledWith({
        title: 'Kiểm tra hồ sơ',
        engagementId: 10,
        sourceType: 'Audit',
        assignedToName: undefined,
      });
      expect(res.id).toBe(1);
    });

    it('should find task by id', async () => {
      const res = await service.findOne(1);

      expect(res?.title).toBe('Task 1');
      expect(tasksService.findOne).toHaveBeenCalledWith(1);
    });

    it('should update task', async () => {
      await service.update(1, { status: 'Completed' });

      expect(tasksService.update).toHaveBeenCalledWith(1, {
        status: 'Completed',
        assignedToName: undefined,
      });
    });

    it('should remove task', async () => {
      const res = await service.remove(1);

      expect(tasksService.remove).toHaveBeenCalledWith(1);
      expect(res).toEqual({ affected: 1 });
    });
  });

  describe('findAll', () => {
    it('should forward engagementId, departmentId and year with the Audit source type', async () => {
      const tasks = [{ id: 1, title: 'Task 1' }];
      tasksService.findAll.mockResolvedValue(tasks);

      const res = await service.findAll(undefined, 10, 'CN_HN', '2026');

      expect(tasksService.findAll).toHaveBeenCalledWith(
        {
          sourceType: 'Audit',
          engagementId: 10,
          departmentId: 'CN_HN',
          year: '2026',
        },
        undefined,
      );
      expect(res).toBe(tasks);
    });

    it('should forward auditee users untouched so TasksService scopes them to their audited department', async () => {
      const auditeeUser = {
        role: 'Đơn vị được kiểm toán',
        legacyDepartment: 'Chi nhánh Hà Nội',
      };

      await service.findAll(auditeeUser);

      expect(tasksService.findAll).toHaveBeenCalledWith(
        { sourceType: 'Audit' },
        auditeeUser,
      );
    });

    it('should forward auditor users untouched so TasksService scopes them to their engagements', async () => {
      const auditorUser = {
        userId: 5,
        role: 'Auditor',
        teamCode: 'TEAM_A',
      };

      await service.findAll(auditorUser);

      expect(tasksService.findAll).toHaveBeenCalledWith(
        { sourceType: 'Audit' },
        auditorUser,
      );
    });
  });
});
