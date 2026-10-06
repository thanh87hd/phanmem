import { Test, TestingModule } from '@nestjs/testing';
import { GeneralTasksService } from './general-tasks.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GeneralTask } from './entities/general-task.entity';
import { User } from '../users/entities/user.entity';
import { TasksService } from '../tasks/tasks.service';

/**
 * GeneralTasksService is a compatibility facade (ADR-0010): every operation is delegated
 * to TasksService with sourceType = 'General'. The GeneralTask repository token only
 * exists to satisfy @InjectRepository(GeneralTask) at DI bootstrap -- the facade never
 * touches it, so it is stubbed empty on purpose.
 */
describe('GeneralTasksService (Clean Test)', () => {
  let service: GeneralTasksService;
  let mockTasksService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  const mockRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((entity) => Promise.resolve({ id: 1, ...entity })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    remove: jest.fn(),
  };
  const mockUserRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTasksService = {
      create: jest.fn((dto) => Promise.resolve({ id: 1, ...dto })),
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeneralTasksService,
        { provide: getRepositoryToken(GeneralTask), useValue: mockRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: TasksService, useValue: mockTasksService },
      ],
    }).compile();

    service = module.get<GeneralTasksService>(GeneralTasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a task successfully', async () => {
    const dto = { title: 'Kiểm kê kho', priority: 'High' };
    const res = await service.create(dto);

    expect(mockTasksService.create).toHaveBeenCalledWith({
      title: 'Kiểm kê kho',
      priority: 'High',
      sourceType: 'General',
    });
    expect(res).toMatchObject(dto);
  });

  it('should forward the KTV user untouched so TasksService filters by assignedToId', async () => {
    const ktvUser = { userId: 10, role: 'Kiểm toán viên', teamCode: 'TEAM_A' };

    await service.findAll(ktvUser);

    expect(mockTasksService.findAll).toHaveBeenCalledWith(
      { sourceType: 'General' },
      ktvUser,
    );
  });
});
