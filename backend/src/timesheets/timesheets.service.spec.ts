import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TimesheetsService } from './timesheets.service';
import { Timesheet } from './entities/timesheet.entity';

describe('TimesheetsService', () => {
  let service: TimesheetsService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      create: jest.fn((dto) => ({ ...dto, id: 1 })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimesheetsService,
        { provide: getRepositoryToken(Timesheet), useValue: repo },
      ],
    }).compile();

    service = module.get<TimesheetsService>(TimesheetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create timesheet', async () => {
    const dto = { username: 'auditor1', hours: 8, task: 'Audit work' };
    const res = await service.create(dto);
    expect(repo.create).toHaveBeenCalledWith(dto);
    expect(repo.save).toHaveBeenCalled();
    expect(res.id).toBe(1);
  });

  it('should find all timesheets', async () => {
    repo.find.mockResolvedValue([{ id: 1 }]);
    const res = await service.findAll();
    expect(res).toHaveLength(1);
    expect(repo.find).toHaveBeenCalledWith({
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  });

  it('should find timesheets by user', async () => {
    repo.find.mockResolvedValue([{ id: 1, username: 'user1' }]);
    const res = await service.findByUser('user1');
    expect(res).toHaveLength(1);
    expect(repo.find).toHaveBeenCalledWith({
      where: { username: 'user1' },
      order: { date: 'DESC' },
    });
  });

  it('should find timesheets by status', async () => {
    repo.find.mockResolvedValue([{ id: 1, status: 'Submitted' }]);
    const res = await service.findByStatus('Submitted');
    expect(res).toHaveLength(1);
    expect(repo.find).toHaveBeenCalledWith({
      where: { status: 'Submitted' },
      order: { date: 'DESC' },
    });
  });

  it('should find one by id', async () => {
    repo.findOne.mockResolvedValue({ id: 1 });
    const res = await service.findOne(1);
    expect(res?.id).toBe(1);
  });

  it('should update timesheet', async () => {
    await service.update(1, { hours: 7.5 });
    expect(repo.update).toHaveBeenCalledWith(1, { hours: 7.5 });
  });

  it('should remove timesheet', async () => {
    await service.remove(1);
    expect(repo.delete).toHaveBeenCalledWith(1);
  });
});
