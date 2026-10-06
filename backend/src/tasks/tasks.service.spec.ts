import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';
import {
  teamMembersContainsClause,
  teamMembersJsonParam,
} from '../common/utils/team-members-filter.util';

/**
 * TC-TASK-01 — "Tạo & Quản Lý Công Việc Ngoài Đoàn (Kanban)"
 * + Phân quyền dữ liệu (data segregation) của TasksService.
 *
 * TasksService là nguồn dữ liệu duy nhất cho cả việc thuộc đoàn (sourceType
 * 'Audit') và việc ngoài đoàn (sourceType 'General'). Bộ test dưới đây kiểm tra
 * HÀNH VI THẬT (payload gửi xuống repository + câu SQL mà query builder nhận):
 *  - CRUD: create / findOne / update / remove;
 *  - thẻ Kanban đổi trạng thái được ghi xuống DB (Todo -> InProgress -> Done);
 *  - scope query theo từng vai trò (admin / auditee / auditor / trưởng đoàn /
 *    KTV / non-KTV) và các filter tường minh;
 *  - lọc thành viên đoàn bằng jsonb containment CHÍNH XÁC
 *    `eng."teamMembers"::jsonb @> :jsonUser::jsonb` (cast tường minh để đúng trên
 *    cả cột `text` lẫn `jsonb`) — KHÔNG còn
 *    `ILIKE '%"userId":%<id>%'` (lỗi false-positive: user 2 khớp `"userId":24`).
 */
describe('TasksService', () => {
  let service: TasksService;
  let taskRepository: any;

  // Query builder giả: mọi method nối chuỗi đều trả về chính nó (đúng như
  // TypeORM SelectQueryBuilder) để `findAll()` chạy được hết chuỗi lệnh.
  const mockQueryBuilder: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    taskRepository = {
      create: jest.fn().mockImplementation((dto: any) => ({ ...dto })),
      save: jest.fn().mockImplementation((entity: any) => Promise.resolve(entity)),
      merge: jest
        .fn()
        .mockImplementation((target: any, dto: any) => Object.assign(target, dto)),
      findOne: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(Task), useValue: taskRepository },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  // ---------------------------------------------------------------------------
  // Helpers đọc lại các lệnh đã gửi xuống query builder
  // ---------------------------------------------------------------------------
  const andWhereCalls = (): any[][] => mockQueryBuilder.andWhere.mock.calls;

  /** Toàn bộ SQL đã gửi vào andWhere, ghép lại để soi từ khoá cấm (ILIKE...). */
  const allSql = (): string =>
    andWhereCalls()
      .map(([sql]: any[]) => String(sql))
      .join(' | ');

  /** Tìm lệnh andWhere có SQL chứa fragment; undefined nếu không có. */
  const findClause = (fragment: string): any[] | undefined =>
    andWhereCalls().find(([sql]: any[]) => String(sql).includes(fragment));

  // ---------------------------------------------------------------------------
  // Người dùng mẫu (payload JWT do JwtAuthGuard bơm vào)
  // ---------------------------------------------------------------------------
  const ADMIN = {
    userId: 1,
    role: 'Admin',
    legacyDepartment: 'KTNB',
    teamCode: 'PKT_HoiSo',
  };
  const AUDITEE = {
    userId: 7,
    role: 'Đơn vị được kiểm toán',
    legacyDepartment: 'PGD_BaDinh',
    teamCode: 'DV_01',
  };
  const AUDITOR = {
    userId: 2,
    role: 'Kiểm toán viên',
    legacyDepartment: 'KTNB',
    teamCode: 'TEAM_A',
  };
  const TEAM_LEAD = {
    userId: 9,
    role: 'Trưởng đoàn',
    legacyDepartment: 'KTNB',
    teamCode: 'TEAM_B',
  };
  const NON_KTV = {
    userId: 20,
    role: 'Trưởng phòng KTNB',
    legacyDepartment: 'KTNB',
    teamCode: 'PKT_DVKD',
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===========================================================================
  // TC-TASK-01: Tạo & quản lý công việc ngoài đoàn (Kanban)
  // ===========================================================================
  describe('create() — TC-TASK-01 tạo thẻ công việc Kanban', () => {
    it('create() dựng entity qua repository.create và lưu bằng repository.save', async () => {
      const dto = {
        title: 'Tập huấn Thông tư mới NHNN',
        sourceType: 'General',
        assignedToId: 22,
        assignedToName: 'datnc3',
        dueDate: '2026-04-30',
        status: 'Todo',
      } as any;
      const persisted = { id: 101, ...dto };
      taskRepository.create.mockReturnValue(persisted);
      taskRepository.save.mockResolvedValue(persisted);

      await expect(service.create(dto)).resolves.toBe(persisted);

      expect(taskRepository.create).toHaveBeenCalledTimes(1);
      expect(taskRepository.create).toHaveBeenCalledWith(dto);
      expect(taskRepository.save).toHaveBeenCalledTimes(1);
      expect(taskRepository.save).toHaveBeenCalledWith(persisted);
      // Thẻ mới phải giữ nguyên trạng thái/cột Kanban do client gửi lên
      expect(taskRepository.save.mock.calls[0][0].status).toBe('Todo');
      expect(taskRepository.save.mock.calls[0][0].assignedToId).toBe(22);
    });
  });

  describe('findOne() / update() / remove() — TC-TASK-01 kéo thả thẻ giữa các cột', () => {
    it('findOne() đọc task kèm quan hệ subTasks + parent', async () => {
      const task = { id: 3, title: 'Nghiên cứu Luật các TCTD 2024' };
      taskRepository.findOne.mockResolvedValue(task);

      await expect(service.findOne(3)).resolves.toBe(task);

      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: 3 },
        relations: ['subTasks', 'parent'],
      });
    });

    it("findOne() ném NotFoundException 'Task with ID 999 not found' khi không có bản ghi", async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        'Task with ID 999 not found',
      );
    });

    it('update() lưu trạng thái mới khi kéo thẻ Kanban: Todo → InProgress → Done', async () => {
      const card: any = {
        id: 7,
        title: 'Tập huấn Thông tư mới NHNN',
        sourceType: 'General',
        status: 'Todo',
      };
      taskRepository.findOne.mockResolvedValue(card);
      taskRepository.save.mockImplementation((entity: any) =>
        Promise.resolve(entity),
      );

      // Kéo từ "Chưa thực hiện" sang "Đang làm"
      const inProgress = await service.update(7, { status: 'InProgress' } as any);
      expect(card.status).toBe('InProgress');
      expect(taskRepository.save).toHaveBeenLastCalledWith(card);
      expect(inProgress.status).toBe('InProgress');

      // Kéo tiếp sang "Hoàn thành"
      const done = await service.update(7, { status: 'Done' } as any);
      expect(card.status).toBe('Done');
      expect(done.status).toBe('Done');
      expect(taskRepository.save).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 7, status: 'Done' }),
      );

      // Mỗi lần kéo thẻ: đọc lại bản ghi rồi merge + save (trạng thái bền vững)
      expect(taskRepository.findOne).toHaveBeenCalledTimes(2);
      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: 7 },
        relations: ['subTasks', 'parent'],
      });
      expect(taskRepository.merge).toHaveBeenCalledWith(card, {
        status: 'InProgress',
      });
      expect(taskRepository.merge).toHaveBeenCalledWith(card, { status: 'Done' });
      expect(taskRepository.save).toHaveBeenCalledTimes(2);
    });

    it('update() ghi tiến độ sub-task rồi tính lại % của task cha (InProgress)', async () => {
      const subTask: any = { id: 11, parentId: 10, progress: 0, status: 'Todo' };
      const parent: any = {
        id: 10,
        status: 'Open',
        progress: 0,
        subTasks: [
          { id: 11, progress: 100 },
          { id: 12, progress: 50 },
          { id: 13, progress: 0 },
        ],
      };
      // Lần 1: findOne(11). Lần 2: recalculateParentProgress đọc task cha.
      taskRepository.findOne
        .mockResolvedValueOnce(subTask)
        .mockResolvedValueOnce(parent);

      await service.update(11, { progress: 100 } as any);

      expect(taskRepository.merge).toHaveBeenCalledWith(subTask, {
        progress: 100,
      });
      expect(subTask.progress).toBe(100);
      // (100 + 50 + 0) / 3 = 50
      expect(parent.progress).toBe(50);
      expect(parent.status).toBe('InProgress');
      expect(taskRepository.save).toHaveBeenNthCalledWith(1, subTask);
      expect(taskRepository.save).toHaveBeenNthCalledWith(2, parent);
    });

    it('update() tự chuyển task cha sang Done và ghi completedDate khi đạt 100%', async () => {
      const subTask: any = { id: 11, parentId: 10, progress: 100, status: 'Done' };
      const parent: any = {
        id: 10,
        status: 'InProgress',
        progress: 0,
        subTasks: [
          { id: 11, progress: 100 },
          { id: 12, progress: 100 },
        ],
      };
      taskRepository.findOne
        .mockResolvedValueOnce(subTask)
        .mockResolvedValueOnce(parent);

      await service.update(11, { progress: 100 } as any);

      expect(parent.progress).toBe(100);
      expect(parent.status).toBe('Done');
      expect(parent.completedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(taskRepository.save).toHaveBeenLastCalledWith(parent);
    });

    it('remove() đọc task theo id rồi xoá đúng thực thể', async () => {
      const task = { id: 5, title: 'Nhiệm vụ cần xoá' };
      taskRepository.findOne.mockResolvedValue(task);

      await expect(service.remove(5)).resolves.toBeUndefined();

      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: 5 },
        relations: ['subTasks', 'parent'],
      });
      expect(taskRepository.remove).toHaveBeenCalledTimes(1);
      expect(taskRepository.remove).toHaveBeenCalledWith(task);
    });
  });

  // ===========================================================================
  // findAll(): câu query thật + filter tường minh
  // ===========================================================================
  describe('findAll() — dựng query và forward filter tường minh', () => {
    it('findAll() dựng base query: join subTasks/engagement/plan, orderBy dueDate ASC, trả về getMany()', async () => {
      const rows = [{ id: 1, title: 'Nghiên cứu Luật các TCTD 2024' }];
      mockQueryBuilder.getMany.mockResolvedValueOnce(rows);

      const result = await service.findAll(undefined, ADMIN);

      expect(taskRepository.createQueryBuilder).toHaveBeenCalledWith('task');
      expect(mockQueryBuilder.leftJoinAndSelect.mock.calls).toEqual([
        ['task.subTasks', 'subTasks'],
        ['task.engagement', 'eng'],
        ['eng.plan', 'plan'],
      ]);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('task.dueDate', 'ASC');
      expect(mockQueryBuilder.getMany).toHaveBeenCalledTimes(1);
      // query rỗng + admin => không có andWhere nào
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
      expect(result).toBe(rows);
    });

    it('findAll() forward đủ filter tường minh (engagementId/departmentId/year/sourceType/…) kèm đúng params', async () => {
      await service.findAll(
        {
          assignedToId: 11,
          assignedById: 12,
          assignedDepartmentId: 13,
          teamCode: 'TEAM_A',
          sourceType: 'General',
          engagementId: 5,
          departmentId: 3,
          year: '2026',
          status: 'Open',
          parentId: null,
        },
        undefined,
      );

      expect(andWhereCalls().map(([sql]: any[]) => sql)).toEqual([
        'task.assignedToId = :assignedToId',
        'task.assignedById = :assignedById',
        'task.assignedDepartmentId = :assignedDepartmentId',
        'task.teamCode = :teamCode',
        'task.sourceType = :sourceType',
        'task.engagementId = :engagementId',
        'eng.legacyAuditedDepartment = :departmentId',
        'plan.year = :year',
        'task.status = :status',
        'task.parentId IS NULL',
      ]);
      expect(andWhereCalls().map(([, params]: any[]) => params)).toEqual([
        { assignedToId: 11 },
        { assignedById: 12 },
        { assignedDepartmentId: 13 },
        { teamCode: 'TEAM_A' },
        { sourceType: 'General' },
        { engagementId: 5 },
        { departmentId: 3 },
        { year: 2026 }, // year được parseInt trước khi bind
        { status: 'Open' },
        undefined, // mệnh đề IS NULL không cần tham số
      ]);
    });

    it("findAll() hiểu parentId = 'null' (query string từ UI) thành task.parentId IS NULL", async () => {
      await service.findAll({ parentId: 'null' }, undefined);

      expect(andWhereCalls()).toHaveLength(1);
      expect(andWhereCalls()[0][0]).toBe('task.parentId IS NULL');
      expect(andWhereCalls()[0][1]).toBeUndefined();
    });

    it('findAll() không truyền user (GET /tasks) thì không áp scope — hành vi hiện tại của service', async () => {
      // if (user) mới áp scope: khi controller không truyền user, service chỉ
      // chạy đúng các filter tường minh. Ghi nhận để tránh hồi quy ngầm.
      await service.findAll({ sourceType: 'Audit' }, undefined);

      expect(andWhereCalls()).toHaveLength(1);
      expect(andWhereCalls()[0][0]).toBe('task.sourceType = :sourceType');
      expect(allSql()).not.toContain('leadAuditorId');
      expect(allSql()).not.toContain('jsonUser');
      expect(allSql()).not.toContain('legacyAuditedDepartment');
    });
  });

  // ===========================================================================
  // findAll(): phân quyền dữ liệu theo vai trò
  // ===========================================================================
  describe('findAll() — phân quyền dữ liệu (data segregation)', () => {
    it.each([{ sourceType: 'Audit' }, { sourceType: 'General' }])(
      'admin ($sourceType): không thêm bất kỳ điều kiện scope nào',
      async ({ sourceType }) => {
        await service.findAll({ sourceType }, ADMIN);

        expect(andWhereCalls()).toHaveLength(1);
        expect(andWhereCalls()[0][0]).toBe('task.sourceType = :sourceType');
        expect(allSql()).not.toContain('leadAuditorId');
        expect(allSql()).not.toContain('jsonUser');
        expect(allSql()).not.toContain('legacyAuditedDepartment');
        expect(allSql()).not.toContain('assignedToId');
        expect(allSql()).not.toContain('task.teamCode');
      },
    );

    it('auditee (sourceType Audit): chỉ giới hạn trong phòng ban được kiểm toán của mình', async () => {
      await service.findAll({ sourceType: 'Audit' }, AUDITEE);

      expect(andWhereCalls()).toHaveLength(2);
      expect(andWhereCalls()[1][0]).toBe('eng.legacyAuditedDepartment = :dept');
      expect(andWhereCalls()[1][1]).toEqual({ dept: 'PGD_BaDinh' });
      // Không dùng scope của KTV
      expect(allSql()).not.toContain('leadAuditorId');
      expect(allSql()).not.toContain('jsonUser');
      expect(allSql()).not.toContain('ownerTeam');
      expect(allSql()).not.toContain('assignedToId');
    });

    it('auditor (sourceType Audit): scope = leadAuditorId OR containment teamMembers OR ownerTeam', async () => {
      await service.findAll({ sourceType: 'Audit' }, AUDITOR);

      expect(andWhereCalls()).toHaveLength(2);
      const call = findClause('eng.leadAuditorId = :userId');
      expect(call).toBeDefined();
      expect(call![0]).toBe(
        '(eng.leadAuditorId = :userId OR eng."teamMembers"::jsonb @> :jsonUser::jsonb OR eng.ownerTeam = :team)',
      );
      expect(call![0]).toContain(teamMembersContainsClause('eng'));
      expect(call![1]).toEqual({
        userId: 2,
        jsonUser: '[{"userId":2}]',
        team: 'TEAM_A',
      });
      expect(call![1].jsonUser).toBe(teamMembersJsonParam(2));
      // Chỉ có 3 tham số: userId, jsonUser, team — không có likeUserId
      expect(Object.keys(call![1])).toEqual(['userId', 'jsonUser', 'team']);
      expect(call![1]).not.toHaveProperty('likeUserId');
    });

    it('team leader (sourceType Audit, non-admin): dùng đúng mệnh đề scope như auditor', async () => {
      await service.findAll({ sourceType: 'Audit' }, TEAM_LEAD);

      const call = findClause('eng.leadAuditorId = :userId');
      expect(call).toBeDefined();
      expect(call![0]).toBe(
        '(eng.leadAuditorId = :userId OR eng."teamMembers"::jsonb @> :jsonUser::jsonb OR eng.ownerTeam = :team)',
      );
      expect(call![1]).toEqual({
        userId: 9,
        jsonUser: '[{"userId":9}]',
        team: 'TEAM_B',
      });
      expect(allSql()).not.toMatch(/ILIKE/i);
    });

    it('regression false-positive: KTV id=2 KHÔNG khớp userId=24, không còn ILIKE \'%"userId":%\'', async () => {
      await service.findAll({ sourceType: 'Audit' }, AUDITOR);

      const sql = allSql();
      // Mệnh đề cũ CAST(teamMembers AS text) ILIKE '%"userId":%2%' đã bị loại bỏ
      expect(sql).not.toMatch(/ILIKE/i);
      expect(sql).not.toContain('CAST(');
      expect(sql).not.toContain('likeUserId');

      const call = findClause('eng."teamMembers"::jsonb @>');
      expect(call).toBeDefined();
      expect(call![0]).toContain(teamMembersContainsClause('eng'));
      expect(call![1].jsonUser).toBe('[{"userId":2}]');
      expect(call![1].jsonUser).not.toContain('%');
      expect(call![1].jsonUser).not.toContain('24');

      // Kiểm chứng ngữ nghĩa containment: đoàn chỉ có userId 24 KHÔNG chứa KTV 2
      const paramUserId = JSON.parse(call![1].jsonUser)[0].userId;
      expect(paramUserId).toBe(2);
      const otherTeamMembers = [
        { userId: 24, fullName: 'Nguyễn Văn A', role: 'KTV' },
      ];
      expect(
        otherTeamMembers.some((m) => m.userId === paramUserId),
      ).toBe(false);
    });

    it.each([
      { role: 'Kiểm toán viên' },
      { role: 'KTV' },
      { role: 'Thành viên' },
    ])(
      'general task cho KTV ($role): chỉ thấy việc được giao cho mình — task.assignedToId = :userId',
      async ({ role }) => {
        await service.findAll(
          { sourceType: 'General' },
          { userId: 42, role, teamCode: 'TEAM_X' },
        );

        expect(andWhereCalls()).toHaveLength(2);
        const call = findClause('task.assignedToId = :userId');
        expect(call).toBeDefined();
        expect(call![0]).toBe('task.assignedToId = :userId');
        expect(call![1]).toEqual({ userId: 42 });
        // Việc ngoài đoàn không bị ràng buộc theo đoàn kiểm toán
        expect(allSql()).not.toContain('task.teamCode = :teamCode');
        expect(allSql()).not.toContain('teamMembers');
      },
    );

    it('general task cho non-KTV (Trưởng phòng): lọc theo teamCode — task.teamCode = :teamCode', async () => {
      await service.findAll({ sourceType: 'General' }, NON_KTV);

      expect(andWhereCalls()).toHaveLength(2);
      const call = findClause('task.teamCode = :teamCode');
      expect(call).toBeDefined();
      expect(call![0]).toBe('task.teamCode = :teamCode');
      expect(call![1]).toEqual({ teamCode: 'PKT_DVKD' });
      expect(allSql()).not.toContain('task.assignedToId = :userId');
      expect(allSql()).not.toContain('teamMembers');
    });

    it('general task cho auditee: rơi vào nhánh teamCode (không phải KTV) — hành vi hiện tại', async () => {
      // AUDITEE không khớp isKtv nên nhánh General dùng teamCode của chính họ.
      // Test ghi nhận đúng hành vi hiện tại của service (xem báo cáo review).
      await service.findAll({ sourceType: 'General' }, AUDITEE);

      expect(andWhereCalls()).toHaveLength(2);
      expect(andWhereCalls()[1][0]).toBe('task.teamCode = :teamCode');
      expect(andWhereCalls()[1][1]).toEqual({ teamCode: 'DV_01' });
      expect(allSql()).not.toContain('task.assignedToId = :userId');
      expect(allSql()).not.toContain('teamMembers');
    });

    it('sourceType lạ (không phải Audit/General): vẫn áp scope fail-closed — không miễn trừ phân tách dữ liệu', async () => {
      // FIX BUG-1: trước đây nhánh scope chỉ chạy khi sourceType đúng
      // 'Audit'/'General'; client chỉ cần gửi sourceType lạ là đọc được toàn bộ.
      await service.findAll({ sourceType: 'Other' }, AUDITOR);

      expect(andWhereCalls()).toHaveLength(2);
      expect(andWhereCalls()[0][0]).toBe('task.sourceType = :sourceType');
      const call = findClause('eng.leadAuditorId = :userId');
      expect(call).toBeDefined();
      expect(call![1]).toEqual({
        userId: 2,
        jsonUser: '[{"userId":2}]',
        team: 'TEAM_A',
      });
      expect(allSql()).not.toMatch(/ILIKE/i);
    });

    // =========================================================================
    // Hồi quy BUG-1 (HIGH — rò rỉ dữ liệu khi thiếu sourceType):
    // `GET /tasks` không kèm sourceType từng bỏ qua TOÀN BỘ scope, mọi vai trò
    // không phải admin đọc được công việc của mọi đoàn/đơn vị.
    // =========================================================================
    it('regression BUG-1: non-admin gọi findAll KHÔNG có sourceType vẫn bị áp scope (OR cả hai bộ quy tắc)', async () => {
      await service.findAll({ status: 'Open' }, AUDITOR);

      expect(andWhereCalls()).toHaveLength(2);
      expect(andWhereCalls()[0]).toEqual([
        'task.status = :status',
        { status: 'Open' },
      ]);

      const call = findClause('eng.leadAuditorId = :userId');
      expect(call).toBeDefined();
      // Hai bộ quy tắc (Audit + General) phải được OR trong CÙNG một mệnh đề,
      // nếu tách thành 2 andWhere thì chúng bị AND và kết quả luôn rỗng.
      expect(call![0]).toBe(
        '((eng.leadAuditorId = :userId OR eng."teamMembers"::jsonb @> :jsonUser::jsonb OR eng.ownerTeam = :team) OR task.assignedToId = :userId)',
      );
      expect(call![0]).toContain(teamMembersContainsClause('eng'));
      expect(call![1]).toEqual({
        userId: 2,
        jsonUser: '[{"userId":2}]',
        team: 'TEAM_A',
      });
      expect(call![1].jsonUser).toBe(teamMembersJsonParam(2));
      // Không được quay lại mẫu chuỗi con ILIKE
      expect(allSql()).not.toMatch(/ILIKE/i);
      expect(allSql()).not.toContain('CAST(');
      expect(allSql()).not.toContain('likeUserId');
    });

    it('regression BUG-1: non-KTV (Trưởng phòng) KHÔNG có sourceType được scope theo teamCode của mình', async () => {
      await service.findAll({}, NON_KTV);

      expect(andWhereCalls()).toHaveLength(1);
      const [sql, params] = andWhereCalls()[0];
      expect(sql).toBe(
        '((eng.leadAuditorId = :userId OR eng."teamMembers"::jsonb @> :jsonUser::jsonb OR eng.ownerTeam = :team) OR task.teamCode = :teamCode)',
      );
      expect(params).toEqual({
        userId: 20,
        jsonUser: '[{"userId":20}]',
        team: 'PKT_DVKD',
        teamCode: 'PKT_DVKD',
      });
    });

    it('regression BUG-1: admin KHÔNG có sourceType vẫn không bị thêm bất kỳ scope nào', async () => {
      await service.findAll({}, ADMIN);

      expect(andWhereCalls()).toHaveLength(0);
      expect(allSql()).not.toContain('leadAuditorId');
      expect(allSql()).not.toContain('assignedToId');
      expect(allSql()).not.toContain('teamCode');
    });

    it('regression BUG-1: auditee KHÔNG có sourceType vẫn bị giới hạn theo đơn vị — không đọc được việc của đơn vị khác', async () => {
      await service.findAll({}, AUDITEE);

      expect(andWhereCalls()).toHaveLength(1);
      const [sql, params] = andWhereCalls()[0];
      // Đơn vị được kiểm toán: cuộc KT của phòng ban mình HOẶC việc ngoài đoàn
      // của chính đơn vị mình — không có nhánh nào trả về toàn bộ dữ liệu.
      expect(sql).toBe(
        '(eng.legacyAuditedDepartment = :dept OR task.teamCode = :teamCode)',
      );
      expect(params).toEqual({ dept: 'PGD_BaDinh', teamCode: 'DV_01' });
      expect(sql).not.toMatch(/ILIKE/i);
      expect(allSql()).not.toContain('leadAuditorId');
      expect(allSql()).not.toContain('jsonUser');
      // Ngữ nghĩa: tham số chỉ khớp đơn vị của chính auditee, không khớp đơn vị khác
      expect(params.dept).toBe(AUDITEE.legacyDepartment);
      expect(params.teamCode).toBe(AUDITEE.teamCode);
      expect(params.dept).not.toBe('PGD_HaiBaTrung');
      expect(params.teamCode).not.toBe('DV_02');
    });
  });
});
