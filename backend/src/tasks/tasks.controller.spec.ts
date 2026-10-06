import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

/**
 * Hồi quy lỗi phân tách dữ liệu ở tầng controller (TC-TASK-01):
 *  1. `GET /tasks/my-tasks` và `/tasks/delegated` từng dùng `req.user.id` trong
 *     khi JWT chỉ trả về `userId` → bộ lọc `assignedToId` bị `undefined` nên
 *     endpoint trả về TOÀN BỘ công việc của mọi người thay vì việc của mình.
 *  2. Các endpoint GET không truyền `req.user` xuống service nên chính sách
 *     phân tách dữ liệu (theo đoàn KT / phòng ban / teamCode) không hề chạy.
 */
describe('TasksController - data segregation wiring (TC-TASK-01)', () => {
  let controller: TasksController;
  let tasksService: { findAll: jest.Mock; create: jest.Mock };

  const jwtUser = {
    userId: 42,
    username: 'datnc3',
    role: 'Kiểm toán viên',
    department: 'Ban KTNB',
    teamCode: 'PKT_DVKD',
  };

  beforeEach(async () => {
    tasksService = {
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [{ provide: TasksService, useValue: tasksService }],
    }).compile();

    controller = module.get<TasksController>(TasksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('GET /tasks phải chuyển req.user xuống service để áp dụng phân tách dữ liệu', async () => {
    const query = { sourceType: 'General' };

    await controller.findAll({ user: jwtUser }, query);

    expect(tasksService.findAll).toHaveBeenCalledWith(query, jwtUser);
  });

  it('GET /tasks/my-tasks phải lọc theo userId (không phải id) và chuyển user xuống service', async () => {
    await controller.findMyTasks({ user: jwtUser }, { status: 'Todo' });

    expect(tasksService.findAll).toHaveBeenCalledWith(
      { status: 'Todo', assignedToId: 42 },
      jwtUser,
    );
    const [filters] = tasksService.findAll.mock.calls[0];
    expect(filters.assignedToId).not.toBeUndefined();
  });

  it('GET /tasks/delegated phải lọc theo assignedById = userId', async () => {
    await controller.findDelegatedTasks({ user: jwtUser }, {});

    expect(tasksService.findAll).toHaveBeenCalledWith(
      { assignedById: 42 },
      jwtUser,
    );
  });

  it('GET /tasks/department/:deptId phải ép kiểu số và chuyển user xuống service', async () => {
    await controller.findDepartmentTasks({ user: jwtUser }, '7', {});

    expect(tasksService.findAll).toHaveBeenCalledWith(
      { assignedDepartmentId: 7 },
      jwtUser,
    );
  });

  it('ưu tiên req.user.userId và bỏ qua trường id lạ (không tái phát lỗi req.user.id)', async () => {
    const conflictingUser = { ...jwtUser, id: 999 };

    await controller.findMyTasks({ user: conflictingUser }, {});

    expect(tasksService.findAll).toHaveBeenCalledWith(
      { assignedToId: 42 },
      conflictingUser,
    );
  });
});
