import { Test, TestingModule } from '@nestjs/testing';
import { MasterDataChangeService } from './master-data-change.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  MasterDataChangeRequest,
  ChangeCategory,
  ChangeType,
  ChangeRequestStatus,
} from './entities/master-data-change-request.entity';
import { Department } from '../departments/entities/department.entity';
import { DepartmentHistory } from '../departments/entities/department-history.entity';
import { DefectCode } from '../ai/entities/defect-code.entity';
import { AuditUniverse } from '../audit-universe/entities/audit-universe.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('MasterDataChangeService', () => {
  let service: MasterDataChangeService;

  const mockQueryBuilder = {
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockChangeRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
  };

  const mockDeptRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 10, ...dto })),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 10, ...dto })),
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockDeptHistoryRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 20, ...dto })),
  };

  const mockDefectRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 30, ...dto })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockUniverseRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 40, ...dto })),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 40, ...dto })),
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockFindingRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MasterDataChangeService,
        {
          provide: getRepositoryToken(MasterDataChangeRequest),
          useValue: mockChangeRepo,
        },
        { provide: getRepositoryToken(Department), useValue: mockDeptRepo },
        {
          provide: getRepositoryToken(DepartmentHistory),
          useValue: mockDeptHistoryRepo,
        },
        { provide: getRepositoryToken(DefectCode), useValue: mockDefectRepo },
        {
          provide: getRepositoryToken(AuditUniverse),
          useValue: mockUniverseRepo,
        },
        {
          provide: getRepositoryToken(AuditFinding),
          useValue: mockFindingRepo,
        },
      ],
    }).compile();

    service = module.get<MasterDataChangeService>(MasterDataChangeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll and findOne', () => {
    it('should findAll with filters', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([{ id: 1 }]);

      const result = await service.findAll({
        category: ChangeCategory.ORGANIZATION,
        status: ChangeRequestStatus.PENDING_L1,
        isMidYearAddition: true,
      });

      expect(result).toHaveLength(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(3);
    });

    it('should findOne if exists', async () => {
      mockChangeRepo.findOne.mockResolvedValue({ id: 1, title: 'Req 1' });
      const result = await service.findOne(1);
      expect(result.id).toBe(1);
    });

    it('should throw NotFoundException if not exists', async () => {
      mockChangeRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create new change request in PENDING_L1', async () => {
      const payload = {
        category: ChangeCategory.ORGANIZATION,
        changeType: ChangeType.ADD,
        title: 'Thêm Chi nhánh mới',
        proposedData: { code: 'CN_MUE', name: 'Chi nhánh Mường Tè' },
      };

      const result = await service.create(payload, {
        fullName: 'KTV Nam',
        userId: 10,
      });
      expect(result).toBeDefined();
      expect(result.status).toBe(ChangeRequestStatus.PENDING_L1);
      expect(result.requestedBy).toBe('KTV Nam');
      expect(mockChangeRepo.save).toHaveBeenCalled();
    });
  });

  describe('approval workflow', () => {
    it('should approve L1 when status is PENDING_L1', async () => {
      mockChangeRepo.findOne.mockResolvedValue({
        id: 1,
        status: ChangeRequestStatus.PENDING_L1,
      });

      const result = await service.approveL1(1, 'Đồng ý cấp phòng', {
        fullName: 'Trưởng Phòng',
      });
      expect(result.status).toBe(ChangeRequestStatus.PENDING_L2);
      expect(result.reviewerL1Name).toBe('Trưởng Phòng');
      expect(mockChangeRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException on approveL1 if not PENDING_L1', async () => {
      mockChangeRepo.findOne.mockResolvedValue({
        id: 1,
        status: ChangeRequestStatus.APPROVED,
      });

      await expect(service.approveL1(1, 'Notes')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException on approveL2 if not PENDING_L2', async () => {
      mockChangeRepo.findOne.mockResolvedValue({
        id: 1,
        status: ChangeRequestStatus.PENDING_L1,
      });

      await expect(service.approveL2(1, 'Notes')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should approve L2, calculate KPI bonus, apply ORGANIZATION ADD, and save', async () => {
      mockChangeRepo.findOne.mockResolvedValue({
        id: 1,
        status: ChangeRequestStatus.PENDING_L2,
        category: ChangeCategory.ORGANIZATION,
        changeType: ChangeType.ADD,
        proposedData: {
          code: 'CN_NEW',
          name: 'Chi nhánh New',
          unitType: 'ChiNhanh',
        },
        isMidYearAddition: true,
        riskImpactLevel: 3,
      });

      const result = await service.approveL2(1, 'Phê duyệt Khối', {
        fullName: 'Lãnh đạo Khối',
      });
      expect(result.status).toBe(ChangeRequestStatus.APPROVED);
      expect(result.kpiBonusPoints).toBe(5.0);
      expect(mockDeptRepo.save).toHaveBeenCalled();
      expect(mockDeptHistoryRepo.save).toHaveBeenCalled();
      expect(mockUniverseRepo.save).toHaveBeenCalled();
    });

    it('should apply ORGANIZATION RESTRUCTURE and inherit findings and universe', async () => {
      mockChangeRepo.findOne.mockResolvedValue({
        id: 2,
        status: ChangeRequestStatus.PENDING_L2,
        category: ChangeCategory.ORGANIZATION,
        changeType: ChangeType.RESTRUCTURE,
        targetId: 10,
        proposedData: { code: 'CN_UPGRADED', name: 'Chi nhánh Nâng cấp' },
        isMidYearAddition: false,
      });

      mockDeptRepo.findOne.mockResolvedValue({
        id: 10,
        code: 'PGD_OLD',
        name: 'PGD Cũ',
        unitType: 'PGD',
      });
      mockUniverseRepo.findOne.mockResolvedValue({
        id: 40,
        departmentCode: 'PGD_OLD',
        riskScore: 3.5,
      });

      const result = await service.approveL2(2, 'Duyệt nâng cấp');
      expect(result.status).toBe(ChangeRequestStatus.APPROVED);
      expect(mockDeptRepo.update).toHaveBeenCalledWith(10, {
        code: 'CN_UPGRADED',
        name: 'Chi nhánh Nâng cấp',
      });
      expect(mockUniverseRepo.save).toHaveBeenCalled();
      expect(mockFindingRepo.createQueryBuilder).toHaveBeenCalled();
    });

    it('should apply ORGANIZATION DEACTIVATE and update status Inactive', async () => {
      mockChangeRepo.findOne.mockResolvedValue({
        id: 3,
        status: ChangeRequestStatus.PENDING_L2,
        category: ChangeCategory.ORGANIZATION,
        changeType: ChangeType.DEACTIVATE,
        targetId: 10,
        proposedData: {},
      });

      mockDeptRepo.findOne.mockResolvedValue({
        id: 10,
        code: 'PGD_CLOSE',
        name: 'PGD Đóng',
        unitType: 'PGD',
      });

      const result = await service.approveL2(3, 'Duyệt đóng cửa');
      expect(result.status).toBe(ChangeRequestStatus.APPROVED);
      expect(mockDeptRepo.update).toHaveBeenCalledWith(10, {
        status: 'Inactive',
      });
    });

    it('should apply DEFECT and RISK changes', async () => {
      // Defect ADD
      mockChangeRepo.findOne.mockResolvedValue({
        id: 4,
        status: ChangeRequestStatus.PENDING_L2,
        category: ChangeCategory.DEFECT,
        changeType: ChangeType.ADD,
        proposedData: { code: 'ERR_01', name: 'Lỗi hồ sơ' },
      });
      await service.approveL2(4, 'Duyệt lỗi');
      expect(mockDefectRepo.save).toHaveBeenCalled();

      // Risk ADD
      mockChangeRepo.findOne.mockResolvedValue({
        id: 5,
        status: ChangeRequestStatus.PENDING_L2,
        category: ChangeCategory.RISK,
        changeType: ChangeType.ADD,
        proposedData: { name: 'Rủi ro mới' },
      });
      await service.approveL2(5, 'Duyệt rủi ro');
      expect(mockUniverseRepo.save).toHaveBeenCalled();
    });

    it('should reject change request', async () => {
      mockChangeRepo.findOne.mockResolvedValue({
        id: 1,
        status: ChangeRequestStatus.PENDING_L1,
      });

      const result = await service.reject(1, 'Không phù hợp');
      expect(result.status).toBe(ChangeRequestStatus.REJECTED);
      expect(result.approverL2Notes).toBe('Không phù hợp');
      expect(mockChangeRepo.save).toHaveBeenCalled();
    });
  });

  describe('getEmergingRisksSummary', () => {
    it('should calculate emerging risks summary metrics', async () => {
      mockChangeRepo.find.mockResolvedValue([
        {
          id: 1,
          isMidYearAddition: true,
          status: ChangeRequestStatus.APPROVED,
          kpiBonusPoints: 5.0,
        },
        {
          id: 2,
          isMidYearAddition: true,
          status: ChangeRequestStatus.APPROVED,
          kpiBonusPoints: 3.0,
        },
        {
          id: 3,
          isMidYearAddition: true,
          status: ChangeRequestStatus.PENDING_L1,
          kpiBonusPoints: null,
        },
      ]);

      const summary = await service.getEmergingRisksSummary();
      expect(summary.totalEmergingRequests).toBe(3);
      expect(summary.approvedEmergingCount).toBe(2);
      expect(summary.totalKpiBonusEarned).toBe(8.0);
    });
  });
});
