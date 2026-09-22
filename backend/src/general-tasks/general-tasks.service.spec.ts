import { Test, TestingModule } from '@nestjs/testing';
import { GeneralTasksService } from './general-tasks.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GeneralTask } from './entities/general-task.entity';
import { User } from '../users/entities/user.entity';

describe('GeneralTasksService (Clean Test)', () => {
  let service: GeneralTasksService;
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeneralTasksService,
        { provide: getRepositoryToken(GeneralTask), useValue: mockRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
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
    expect(res).toMatchObject(dto);
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it('should filter tasks by assignedToId for standard auditors (KTV)', async () => {
    mockUserRepo.findOne.mockResolvedValue({
      id: 10,
      role: { name: 'Kiểm toán viên' },
      teamCode: 'TEAM_A',
    });

    await service.findAll({ userId: 10 });
    expect(mockRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ assignedToId: 10 }),
      }),
    );
  });
});
