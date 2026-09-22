import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TrainingService } from './training.service';
import { TrainingRecord } from './entities/training-record.entity';

describe('TrainingService', () => {
  let service: TrainingService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      count: jest.fn().mockResolvedValue(1),
      find: jest.fn().mockResolvedValue([]),
      findOneBy: jest.fn().mockResolvedValue(null),
      create: jest.fn((dto) =>
        Array.isArray(dto)
          ? dto.map((d, i) => ({ ...d, id: i + 1 }))
          : { ...dto, id: 1 },
      ),
      save: jest.fn((entity) => Promise.resolve(entity)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      manager: {
        findOne: jest.fn().mockResolvedValue(null),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainingService,
        { provide: getRepositoryToken(TrainingRecord), useValue: repo },
      ],
    }).compile();

    service = module.get<TrainingService>(TrainingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should seed default records when count is 0 and users exist', async () => {
      repo.count.mockResolvedValue(0);
      repo.manager.findOne
        .mockResolvedValueOnce({
          id: 1,
          fullName: 'GĐ Khối',
          username: 'binhtt12',
        })
        .mockResolvedValueOnce({
          id: 2,
          fullName: 'KTV Cao Cấp',
          username: 'chaunm3',
        })
        .mockResolvedValueOnce({
          id: 3,
          fullName: 'KTV Thường',
          username: 'oanhdtk4',
        });

      await service.onModuleInit();
      expect(repo.save).toHaveBeenCalled();
    });

    it('should skip seeding if count > 0', async () => {
      repo.count.mockResolvedValue(5);
      await service.onModuleInit();
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('CRUD operations', () => {
    it('should create training record', async () => {
      const dto = { courseName: 'CIA Part 1', cpeHours: 20, userId: 1 };
      const res = await service.create(dto);
      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(repo.save).toHaveBeenCalled();
      expect(res.id).toBe(1);
    });

    it('should find all records with optional query', async () => {
      repo.find.mockResolvedValue([{ id: 1, userId: 2, year: 2026 }]);
      const res = await service.findAll({ userId: 2, year: 2026 });
      expect(res).toHaveLength(1);
      expect(repo.find).toHaveBeenCalledWith({
        where: { userId: 2, year: 2026 },
        order: { startDate: 'DESC' },
      });
    });

    it('should find one by id', async () => {
      repo.findOneBy.mockResolvedValue({ id: 1, courseName: 'AML' });
      const res = await service.findOne(1);
      expect(res?.courseName).toBe('AML');
    });

    it('should update record', async () => {
      await service.update(1, { cpeHours: 25 });
      expect(repo.update).toHaveBeenCalledWith(1, { cpeHours: 25 });
    });

    it('should remove record', async () => {
      await service.remove(1);
      expect(repo.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('getCpeSummary', () => {
    it('should calculate CPE compliance summary for users', async () => {
      const mockRecords = [
        { userId: 1, userName: 'Nguyễn Văn A', cpeHours: 30, year: 2026 },
        { userId: 1, userName: 'Nguyễn Văn A', cpeHours: 15, year: 2026 }, // total 45 -> compliant
        { userId: 2, userName: 'Trần Thị B', cpeHours: 20, year: 2026 }, // total 20 -> non-compliant
      ];
      repo.find.mockResolvedValue(mockRecords);

      const res = await service.getCpeSummary(2026);
      expect(res.year).toBe(2026);
      expect(res.summary).toHaveLength(2);
      expect(res.totalCompliant).toBe(1);
      expect(res.totalNonCompliant).toBe(1);

      const userA = res.summary.find((s) => s.userId === 1);
      expect(userA?.totalCpe).toBe(45);
      expect(userA?.isCompliant).toBe(true);
      expect(userA?.remaining).toBe(0);

      const userB = res.summary.find((s) => s.userId === 2);
      expect(userB?.totalCpe).toBe(20);
      expect(userB?.isCompliant).toBe(false);
      expect(userB?.remaining).toBe(20);
    });

    it('should calculate ethics hours compliance and certification tracking (IIA Standard 4.2)', async () => {
      const mockRecords = [
        {
          userId: 1,
          userName: 'Auditor A',
          cpeHours: 40,
          ethicsHours: 2,
          certificationType: 'CIA',
          year: 2026,
        },
      ];
      repo.find.mockResolvedValue(mockRecords);

      const res = await service.getCpeSummary(2026);
      expect(res.totalEthicsCompliant).toBe(1);
      expect(res.summary[0].isEthicsCompliant).toBe(true);
      expect(res.summary[0].certifications).toContain('CIA');
    });

    it('should verify training record by authorized user', async () => {
      repo.findOneBy.mockResolvedValue({ id: 1, isVerified: false });

      const user = { userId: 99, fullName: 'Training Director' };
      const res = await service.verifyRecord(1, user);
      expect(res.isVerified).toBe(true);
      expect(res.verifiedById).toBe(99);
      expect(res.verifiedByName).toBe('Training Director');
    });
  });
});
