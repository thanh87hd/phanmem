import { Test, TestingModule } from '@nestjs/testing';
import { IndependenceService } from './independence.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictDeclaration } from './entities/conflict-declaration.entity';
import { AuditorRotation } from './entities/auditor-rotation.entity';
import { User } from '../users/entities/user.entity';

describe('IndependenceService', () => {
  let service: IndependenceService;

  const mockConflictRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
  };

  const mockRotationRepo = {
    count: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockUserRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    save: jest.fn().mockImplementation((dto) => Promise.resolve(dto)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndependenceService,
        {
          provide: getRepositoryToken(ConflictDeclaration),
          useValue: mockConflictRepo,
        },
        {
          provide: getRepositoryToken(AuditorRotation),
          useValue: mockRotationRepo,
        },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<IndependenceService>(IndependenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should seed default rotations when rotationRepo is empty', async () => {
      mockRotationRepo.count.mockResolvedValue(0);
      mockUserRepo.find.mockResolvedValue([]);

      await service.onModuleInit();
      expect(mockRotationRepo.count).toHaveBeenCalled();
      expect(mockRotationRepo.save).toHaveBeenCalled();
    });

    it('should skip seeding when rotationRepo is not empty', async () => {
      mockRotationRepo.count.mockResolvedValue(2);
      mockUserRepo.find.mockResolvedValue([{ username: 'admin' }]);

      await service.onModuleInit();
      expect(mockRotationRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('declarations', () => {
    it('should get declarations', async () => {
      mockConflictRepo.find.mockResolvedValue([{ id: 1 }]);
      const result = await service.getDeclarations();
      expect(result).toHaveLength(1);
    });

    it('should create declaration', async () => {
      const data = { hasConflict: false, details: 'Không có xung đột' };
      const result = await service.createDeclaration(5, data);
      expect(result).toBeDefined();
      expect(mockConflictRepo.create).toHaveBeenCalled();
      expect(mockConflictRepo.save).toHaveBeenCalled();
    });
  });

  describe('rotations', () => {
    it('should get rotations', async () => {
      mockRotationRepo.find.mockResolvedValue([{ id: 1 }]);
      const result = await service.getRotations();
      expect(result).toHaveLength(1);
    });

    it('should create rotation', async () => {
      const data = { auditorName: 'Nguyen Van A' };
      const result = await service.createRotation(data);
      expect(result).toBeDefined();
      expect(mockRotationRepo.save).toHaveBeenCalled();
    });

    it('should delete rotation', async () => {
      const result = await service.deleteRotation(1);
      expect(result).toEqual({ success: true });
      expect(mockRotationRepo.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('cooling-off', () => {
    it('should get cooling off users', async () => {
      mockUserRepo.find.mockResolvedValue([
        { id: 1, priorDepartments: 'Tín dụng' },
        { id: 2, priorDepartments: null, coolingOffEndDate: null },
      ]);

      const result = await service.getCoolingOff();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('should save cooling off for existing user', async () => {
      const user = { id: 1, priorDepartments: null };
      mockUserRepo.findOne.mockResolvedValue(user);

      const result = await service.saveCoolingOff({
        userId: 1,
        priorDepartments: 'Kế toán',
        coolingOffEndDate: '2026-12-31',
        transferDate: '2025-01-01',
      });
      expect(result.priorDepartments).toBe('Kế toán');
      expect(mockUserRepo.save).toHaveBeenCalled();
    });

    it('should throw error in saveCoolingOff if user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        service.saveCoolingOff({
          userId: 999,
          priorDepartments: 'IT',
          coolingOffEndDate: '2026-12-31',
        }),
      ).rejects.toThrow('User not found');
    });

    it('should remove cooling off', async () => {
      const user = {
        id: 1,
        priorDepartments: 'IT',
        coolingOffEndDate: '2026-12-31',
      };
      mockUserRepo.findOne.mockResolvedValue(user);

      const result = await service.removeCoolingOff(1);
      expect(result).toEqual({ success: true });
      expect(user.priorDepartments).toBeNull();
      expect(mockUserRepo.save).toHaveBeenCalled();
    });
  });

  describe('checkAssignmentSafety', () => {
    it('should return conflict violation when conflict matches department', async () => {
      mockConflictRepo.findOne.mockResolvedValue({
        id: 1,
        hasConflict: true,
        details: 'Có người thân tại Chi nhánh Hà Nội',
      });

      const result = await service.checkAssignmentSafety(
        1,
        'Tran B',
        'Chi nhánh Hà Nội',
      );
      expect(result.safe).toBe(false);
      expect(result.reason).toContain('Phát hiện xung đột lợi ích');
    });

    it('should return rotation violation when auditor is restricted and before next date', async () => {
      mockConflictRepo.findOne.mockResolvedValue(null);
      mockRotationRepo.findOne.mockResolvedValue({
        id: 1,
        isRestricted: true,
        nextAllowedAuditDate: '2099-01-01',
      });

      const result = await service.checkAssignmentSafety(
        1,
        'Tran B',
        'Chi nhánh Đà Nẵng',
      );
      expect(result.safe).toBe(false);
      expect(result.reason).toContain('Bắt buộc phải quay vòng kiểm toán viên');
    });

    it('should return cooling-off violation when auditor prior department matches and not past date', async () => {
      mockConflictRepo.findOne.mockResolvedValue(null);
      mockRotationRepo.findOne.mockResolvedValue(null);
      mockUserRepo.findOne.mockResolvedValue({
        id: 1,
        priorDepartments: 'Phòng Thẻ Hội Sở',
        coolingOffEndDate: '2099-12-31',
      });

      const result = await service.checkAssignmentSafety(
        1,
        'Tran B',
        'Phòng Thẻ',
      );
      expect(result.safe).toBe(false);
      expect(result.reason).toContain('Vi phạm thời hạn cách ly độc lập');
    });

    it('should return safe: true when no restrictions found', async () => {
      mockConflictRepo.findOne.mockResolvedValue(null);
      mockRotationRepo.findOne.mockResolvedValue(null);
      mockUserRepo.findOne.mockResolvedValue({ id: 1 });

      const result = await service.checkAssignmentSafety(
        1,
        'Tran B',
        'Chi nhánh Cần Thơ',
      );
      expect(result.safe).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow assignment when conflict is approved as an exception by CAE', async () => {
      mockConflictRepo.findOne.mockResolvedValue({
        id: 1,
        hasConflict: true,
        details: 'Chi nhánh Hà Nội',
        caeApprovalStatus: 'Approved',
      });
      mockRotationRepo.findOne.mockResolvedValue(null);
      mockUserRepo.findOne.mockResolvedValue({ id: 1 });

      const result = await service.checkAssignmentSafety(
        1,
        'Tran B',
        'Chi nhánh Hà Nội',
      );
      expect(result.safe).toBe(true);
    });
  });

  describe('CAE Exception Workflow', () => {
    it('should approve conflict exception with CAE notes', async () => {
      mockConflictRepo.findOne.mockResolvedValue({
        id: 1,
        hasConflict: true,
        caeApprovalStatus: 'Pending',
      });

      const user = { userId: 99, fullName: 'Trưởng Ban KTNB' };
      const result = await service.approveConflictException(
        1,
        user,
        'Cho phép với điều kiện soát xét độc lập',
      );
      expect(result.caeApprovalStatus).toBe('Approved');
      expect(result.caeApprovedById).toBe(99);
      expect(result.caeNotes).toContain('soát xét độc lập');
    });

    it('should reject conflict exception', async () => {
      mockConflictRepo.findOne.mockResolvedValue({
        id: 1,
        hasConflict: true,
        caeApprovalStatus: 'Pending',
      });

      const user = { userId: 99, fullName: 'Trưởng Ban KTNB' };
      const result = await service.rejectConflictException(
        1,
        user,
        'Không chấp nhận ngoại lệ',
      );
      expect(result.caeApprovalStatus).toBe('Rejected');
      expect(result.caeApprovedById).toBe(99);
    });
  });
});
