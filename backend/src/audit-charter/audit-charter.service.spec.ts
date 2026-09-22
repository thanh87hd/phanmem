import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditCharterService } from './audit-charter.service';
import { AuditCharter } from './entities/audit-charter.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AuditCharterService', () => {
  let service: AuditCharterService;
  let repo: jest.Mocked<Repository<AuditCharter>>;

  const mockUser = {
    userId: 1,
    fullName: 'Admin KTNB',
    username: 'admin',
    role: 'ADMIN',
  };

  const mockCharter: Partial<AuditCharter> = {
    id: 1,
    title: 'Điều lệ KTNB LPBank 2026',
    version: 1,
    purpose: 'Mục đích hoạt động KTNB',
    authority: 'Thẩm quyền truy cập hồ sơ',
    responsibility: 'Trách nhiệm kiểm toán',
    status: 'Draft',
    draftedById: 1,
    draftedByName: 'Admin KTNB',
    revisionHistory: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditCharterService,
        {
          provide: getRepositoryToken(AuditCharter),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuditCharterService>(AuditCharterService);
    repo = module.get(getRepositoryToken(AuditCharter));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all charters ordered by version DESC', async () => {
      repo.find.mockResolvedValue([mockCharter as AuditCharter]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(repo.find).toHaveBeenCalledWith({
        order: { version: 'DESC', createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a charter by id', async () => {
      repo.findOne.mockResolvedValue(mockCharter as AuditCharter);
      const result = await service.findOne(1);
      expect(result.title).toBe('Điều lệ KTNB LPBank 2026');
    });

    it('should throw NotFoundException if not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a charter in Draft status', async () => {
      const dto = {
        title: 'New Charter',
        purpose: 'purpose',
        authority: 'authority',
        responsibility: 'responsibility',
      };
      repo.create.mockReturnValue({ ...dto, status: 'Draft' } as any);
      repo.save.mockResolvedValue({
        id: 2,
        ...dto,
        status: 'Draft',
      } as AuditCharter);

      const result = await service.create(dto, mockUser);
      expect(result.status).toBe('Draft');
      expect(repo.create).toHaveBeenCalled();
    });
  });

  describe('submitForApproval', () => {
    it('should transition Draft → PendingApproval', async () => {
      const charter = { ...mockCharter, status: 'Draft', revisionHistory: [] };
      repo.findOne.mockResolvedValue(charter as AuditCharter);
      repo.save.mockResolvedValue({
        ...charter,
        status: 'PendingApproval',
      } as AuditCharter);

      const result = await service.submitForApproval(1, mockUser);
      expect(result.status).toBe('PendingApproval');
    });

    it('should reject if not in Draft', async () => {
      repo.findOne.mockResolvedValue({
        ...mockCharter,
        status: 'Approved',
      } as AuditCharter);
      await expect(service.submitForApproval(1, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('approve', () => {
    it('should transition PendingApproval → Approved', async () => {
      const charter = {
        ...mockCharter,
        status: 'PendingApproval',
        revisionHistory: [],
      };
      repo.findOne.mockResolvedValue(charter as AuditCharter);
      repo.update.mockResolvedValue(undefined as any); // supersede old
      repo.save.mockResolvedValue({
        ...charter,
        status: 'Approved',
      } as AuditCharter);

      const result = await service.approve(1, mockUser, 'LGTM');
      expect(result.status).toBe('Approved');
    });

    it('should reject if not PendingApproval', async () => {
      repo.findOne.mockResolvedValue({
        ...mockCharter,
        status: 'Draft',
      } as AuditCharter);
      await expect(service.approve(1, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('reject', () => {
    it('should transition PendingApproval → Draft', async () => {
      const charter = {
        ...mockCharter,
        status: 'PendingApproval',
        revisionHistory: [],
      };
      repo.findOne.mockResolvedValue(charter as AuditCharter);
      repo.save.mockResolvedValue({
        ...charter,
        status: 'Draft',
      } as AuditCharter);

      const result = await service.reject(1, mockUser, 'Cần bổ sung phạm vi');
      expect(result.status).toBe('Draft');
    });
  });

  describe('createNewVersion', () => {
    it('should create v2 from v1', async () => {
      const source = { ...mockCharter, version: 1 };
      repo.findOne.mockResolvedValue(source as AuditCharter);
      repo.create.mockReturnValue({ ...source, version: 2 } as any);
      repo.save.mockResolvedValue({
        id: 3,
        ...source,
        version: 2,
        status: 'Draft',
      } as AuditCharter);

      const result = await service.createNewVersion(1, mockUser);
      expect(result.version).toBe(2);
      expect(result.status).toBe('Draft');
    });
  });

  describe('remove', () => {
    it('should delete a Draft charter', async () => {
      repo.findOne.mockResolvedValue({
        ...mockCharter,
        status: 'Draft',
      } as AuditCharter);
      repo.remove.mockResolvedValue(undefined as any);
      await expect(service.remove(1)).resolves.not.toThrow();
    });

    it('should reject deleting an Approved charter', async () => {
      repo.findOne.mockResolvedValue({
        ...mockCharter,
        status: 'Approved',
      } as AuditCharter);
      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });
  });
});
