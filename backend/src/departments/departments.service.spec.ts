import { Test, TestingModule } from '@nestjs/testing';
import { DepartmentsService } from './departments.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Department } from './entities/department.entity';
import { DepartmentHistory } from './entities/department-history.entity';
import { AuditUniverse } from '../audit-universe/entities/audit-universe.entity';
import { User } from '../users/entities/user.entity';
import { BadRequestException } from '@nestjs/common';

describe('DepartmentsService', () => {
  let service: DepartmentsService;

  const mockDepartmentRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 1, ...dto })),
    save: jest
      .fn()
      .mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockHistoryRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 10, ...dto })),
    save: jest
      .fn()
      .mockImplementation((entity) => Promise.resolve({ id: 10, ...entity })),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockAuditUniverseRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 100, ...dto })),
    save: jest
      .fn()
      .mockImplementation((entity) => Promise.resolve({ id: 100, ...entity })),
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        {
          provide: getRepositoryToken(Department),
          useValue: mockDepartmentRepo,
        },
        {
          provide: getRepositoryToken(DepartmentHistory),
          useValue: mockHistoryRepo,
        },
        {
          provide: getRepositoryToken(AuditUniverse),
          useValue: mockAuditUniverseRepo,
        },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<DepartmentsService>(DepartmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create new department and sync to audit universe when not existing', async () => {
      mockDepartmentRepo.findOne.mockResolvedValue(null);
      mockAuditUniverseRepo.findOne.mockResolvedValue(null);

      const dto = {
        code: 'CN_HN',
        name: 'Chi nhánh Hà Nội',
        unitType: 'ChiNhanh',
      };

      const result = await service.create(dto);
      expect(result).toBeDefined();
      expect(mockDepartmentRepo.create).toHaveBeenCalled();
      expect(mockDepartmentRepo.save).toHaveBeenCalled();
      expect(mockAuditUniverseRepo.save).toHaveBeenCalled();
    });

    it('should update existing department and sync to audit universe', async () => {
      const existing = {
        id: 1,
        code: 'CN_HN',
        name: 'Chi nhánh Cũ',
        unitType: 'ChiNhanh',
      };
      mockDepartmentRepo.findOne.mockResolvedValue(existing);
      mockAuditUniverseRepo.findOne.mockResolvedValue({
        id: 99,
        departmentCode: 'CN_HN',
      });

      const dto = {
        code: 'CN_HN',
        name: 'Chi nhánh Hà Nội Mới',
        unitType: 'ChiNhanh',
      };

      const result = await service.create(dto);
      expect(result.name).toBe('Chi nhánh Hà Nội Mới');
      expect(mockDepartmentRepo.save).toHaveBeenCalled();
      expect(mockAuditUniverseRepo.update).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all departments when all=true or user is undefined', async () => {
      mockDepartmentRepo.find.mockResolvedValue([
        { id: 1, name: 'Phòng KTNB' },
      ]);

      const resultAll = await service.findAll(undefined, true);
      expect(resultAll).toHaveLength(1);
      expect(mockDepartmentRepo.find).toHaveBeenCalledWith({
        order: { unitType: 'ASC', name: 'ASC' },
      });
    });

    it('should return all departments for KTNB staff', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        id: 2,
        role: { name: 'Trưởng đoàn kiểm toán' },
      });
      mockDepartmentRepo.find.mockResolvedValue([
        { id: 1, name: 'Phòng KTNB' },
      ]);

      const result = await service.findAll({ userId: 2 }, false);
      expect(result).toHaveLength(1);
    });

    it('should filter departments by user department if not KTNB staff', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        id: 5,
        department: 'Khối CNTT',
        role: { name: 'Auditee' },
      });
      mockDepartmentRepo.find.mockResolvedValueOnce([
        { id: 3, name: 'Khối CNTT' },
      ]);

      const result = await service.findAll({ userId: 5 }, false);
      expect(result).toEqual([{ id: 3, name: 'Khối CNTT' }]);
    });
  });

  describe('findOne', () => {
    it('should find department by id', async () => {
      mockDepartmentRepo.findOneBy.mockResolvedValue({
        id: 1,
        name: 'Ban Giám đốc',
      });
      const result = await service.findOne(1);
      expect(result).toEqual({ id: 1, name: 'Ban Giám đốc' });
      expect(mockDepartmentRepo.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });
  });

  describe('update', () => {
    it('should throw BadRequestException if duplicate code belongs to another department', async () => {
      mockDepartmentRepo.findOne.mockResolvedValue({ id: 2, code: 'CN_HCM' });

      await expect(
        service.update(1, { code: 'CN_HCM' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update department and sync to audit universe', async () => {
      mockDepartmentRepo.findOne.mockResolvedValue(null);
      mockDepartmentRepo.findOneBy.mockResolvedValue({
        id: 1,
        code: 'CN_DN',
        name: 'Chi nhánh Đà Nẵng Cập nhật',
        unitType: 'ChiNhanh',
      });
      mockAuditUniverseRepo.findOne.mockResolvedValue(null);

      const result = await service.update(1, {
        name: 'Chi nhánh Đà Nẵng Cập nhật',
      });
      expect(result?.name).toBe('Chi nhánh Đà Nẵng Cập nhật');
      expect(mockDepartmentRepo.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove department and related audit universe record', async () => {
      mockDepartmentRepo.findOneBy.mockResolvedValue({ id: 1, code: 'CN_HP' });

      const result = await service.remove(1);
      expect(result).toEqual({ success: true });
      expect(mockAuditUniverseRepo.delete).toHaveBeenCalledWith({
        departmentCode: 'CN_HP',
      });
      expect(mockDepartmentRepo.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('recordPeriodSnapshot', () => {
    it('should throw BadRequestException if department not found', async () => {
      mockDepartmentRepo.findOneBy.mockResolvedValue(null);

      await expect(service.recordPeriodSnapshot(2025, 999)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create new snapshot if none exists for period', async () => {
      mockDepartmentRepo.findOneBy.mockResolvedValue({
        id: 1,
        code: 'CN_1',
        name: 'CN 1',
        unitType: 'PGD',
      });
      mockHistoryRepo.findOne
        .mockResolvedValueOnce(null) // existing for 2025
        .mockResolvedValueOnce({ unitType: 'PGD' }); // prev for 2024

      const result = await service.recordPeriodSnapshot(
        2025,
        1,
        'GiuNguyen',
        'Note test',
        'QĐ-01',
      );
      expect(result).toBeDefined();
      expect(mockHistoryRepo.create).toHaveBeenCalled();
      expect(mockHistoryRepo.save).toHaveBeenCalled();
    });

    it('should update existing snapshot if found', async () => {
      mockDepartmentRepo.findOneBy.mockResolvedValue({
        id: 1,
        code: 'CN_1',
        name: 'CN 1',
        unitType: 'ChiNhanh',
      });
      const existingHistory = { id: 10, periodYear: 2025, departmentId: 1 };
      mockHistoryRepo.findOne
        .mockResolvedValueOnce(existingHistory)
        .mockResolvedValueOnce({ unitType: 'PGD' });

      const result = await service.recordPeriodSnapshot(2025, 1, 'NangCap');
      expect(result).toBeDefined();
      expect(mockHistoryRepo.save).toHaveBeenCalled();
    });
  });

  describe('comparePeriods', () => {
    it('should compare two periods and classify changes correctly', async () => {
      const depts = [
        {
          id: 1,
          code: 'D1',
          name: 'Dept 1',
          unitType: 'ChiNhanh',
          status: 'Active',
        },
        {
          id: 2,
          code: 'D2',
          name: 'Dept 2',
          unitType: 'ChiNhanh',
          status: 'Active',
        },
        {
          id: 3,
          code: 'D3',
          name: 'Dept 3',
          unitType: 'PGD',
          status: 'Inactive',
        },
        {
          id: 4,
          code: 'D4',
          name: 'Dept 4',
          unitType: 'ChiNhanh',
          status: 'Active',
        },
      ];
      mockDepartmentRepo.find.mockResolvedValue(depts);

      mockHistoryRepo.find
        .mockResolvedValueOnce([
          { departmentCode: 'D1', departmentId: 1, unitType: 'ChiNhanh' },
          { departmentCode: 'D2', departmentId: 2, unitType: 'PGD' },
          { departmentCode: 'D3', departmentId: 3, unitType: 'PGD' },
        ])
        .mockResolvedValueOnce([
          { departmentCode: 'D1', departmentId: 1, unitType: 'ChiNhanh' },
          { departmentCode: 'D2', departmentId: 2, unitType: 'ChiNhanh' },
          { departmentCode: 'D4', departmentId: 4, unitType: 'ChiNhanh' },
        ]);

      const result = await service.comparePeriods(2024, 2025);
      expect(result.year1).toBe(2024);
      expect(result.year2).toBe(2025);
      expect(result.unchangedCount).toBe(1); // D1
      expect(result.upgradedUnits).toHaveLength(1); // D2 from PGD to ChiNhanh
      expect(result.newUnits).toHaveLength(1); // D4 new
      expect(result.closedUnits).toHaveLength(1); // D3 closed/inactive
    });
  });

  describe('getUnitHistory', () => {
    it('should return unit history ordered by periodYear ASC', async () => {
      mockHistoryRepo.find.mockResolvedValue([
        { id: 1, periodYear: 2024 },
        { id: 2, periodYear: 2025 },
      ]);

      const result = await service.getUnitHistory(1);
      expect(result).toHaveLength(2);
      expect(mockHistoryRepo.find).toHaveBeenCalledWith({
        where: { departmentId: 1 },
        order: { periodYear: 'ASC' },
      });
    });
  });
});
