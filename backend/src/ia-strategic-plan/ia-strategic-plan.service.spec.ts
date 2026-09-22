import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { IaStrategicPlanService } from './ia-strategic-plan.service';
import { IaStrategicPlan } from './entities/ia-strategic-plan.entity';

describe('IaStrategicPlanService', () => {
  let service: IaStrategicPlanService;
  let repo: Repository<IaStrategicPlan>;

  const mockRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IaStrategicPlanService,
        {
          provide: getRepositoryToken(IaStrategicPlan),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<IaStrategicPlanService>(IaStrategicPlanService);
    repo = module.get<Repository<IaStrategicPlan>>(getRepositoryToken(IaStrategicPlan));
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of strategic plans', async () => {
      const expected = [{ id: 1, title: 'Strategic Plan 2026-2030' }];
      mockRepo.find.mockResolvedValue(expected);

      const result = await service.findAll();
      expect(result).toEqual(expected);
      expect(mockRepo.find).toHaveBeenCalledWith({ order: { startYear: 'DESC' } });
    });
  });

  describe('findOne', () => {
    it('should return a single plan if found', async () => {
      const plan = { id: 1, title: 'Plan 1' };
      mockRepo.findOne.mockResolvedValue(plan);

      const result = await service.findOne(1);
      expect(result).toEqual(plan);
    });

    it('should throw NotFoundException if plan not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and save a new strategic plan in Draft status', async () => {
      const dto = { title: 'KHCL KTNB 2026-2028', startYear: 2026, endYear: 2028 };
      const user = { userId: 10, fullName: 'Trưởng Ban KTNB' };
      const created = { ...dto, status: 'Draft', preparedById: 10 };

      mockRepo.create.mockReturnValue(created);
      mockRepo.save.mockResolvedValue({ id: 1, ...created });

      const result = await service.create(dto as any, user);
      expect(result.id).toBe(1);
      expect(mockRepo.create).toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update plan if Draft', async () => {
      const plan = { id: 1, title: 'Old Title', status: 'Draft' };
      mockRepo.findOne.mockResolvedValue(plan);
      mockRepo.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.update(1, { title: 'New Title' });
      expect(result.title).toBe('New Title');
    });

    it('should throw BadRequestException if updating Approved plan', async () => {
      const plan = { id: 1, title: 'Approved Plan', status: 'Approved' };
      mockRepo.findOne.mockResolvedValue(plan);

      await expect(service.update(1, { title: 'Changed' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('submitForApproval', () => {
    it('should transition status from Draft to PendingApproval', async () => {
      const plan = { id: 1, status: 'Draft', reviewHistory: [] };
      mockRepo.findOne.mockResolvedValue(plan);
      mockRepo.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.submitForApproval(1, { userId: 5, fullName: 'Auditor' });
      expect(result.status).toBe('PendingApproval');
      expect(result.reviewHistory.length).toBe(1);
      expect(result.reviewHistory[0].action).toBe('SUBMIT');
    });

    it('should throw BadRequestException if plan is not Draft', async () => {
      const plan = { id: 1, status: 'PendingApproval' };
      mockRepo.findOne.mockResolvedValue(plan);

      await expect(service.submitForApproval(1, { userId: 5 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('approve', () => {
    it('should approve plan and record approval metadata', async () => {
      const plan = { id: 1, status: 'PendingApproval', reviewHistory: [] };
      mockRepo.findOne.mockResolvedValue(plan);
      mockRepo.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.approve(1, { userId: 1, fullName: 'HĐQT' }, 'Đã duyệt');
      expect(result.status).toBe('Approved');
      expect(result.approvedById).toBe(1);
      expect(result.approvalNotes).toBe('Đã duyệt');
      expect(result.reviewHistory.some((h) => h.action === 'APPROVE')).toBe(true);
    });

    it('should throw BadRequestException if approving non-Pending plan', async () => {
      const plan = { id: 1, status: 'Draft' };
      mockRepo.findOne.mockResolvedValue(plan);

      await expect(service.approve(1, { userId: 1 })).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject', () => {
    it('should reject plan back to Draft', async () => {
      const plan = { id: 1, status: 'PendingApproval', reviewHistory: [] };
      mockRepo.findOne.mockResolvedValue(plan);
      mockRepo.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.reject(1, { userId: 1, fullName: 'HĐQT' }, 'Cần bổ sung');
      expect(result.status).toBe('Draft');
      expect(result.reviewHistory.some((h) => h.action === 'REJECT')).toBe(true);
    });

    it('should throw BadRequestException if rejecting non-Pending plan', async () => {
      const plan = { id: 1, status: 'Draft' };
      mockRepo.findOne.mockResolvedValue(plan);

      await expect(service.reject(1, { userId: 1 }, 'Notes')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('should remove plan if not Approved', async () => {
      const plan = { id: 1, status: 'Draft' };
      mockRepo.findOne.mockResolvedValue(plan);
      mockRepo.remove.mockResolvedValue(plan);

      await expect(service.remove(1)).resolves.not.toThrow();
      expect(mockRepo.remove).toHaveBeenCalledWith(plan);
    });

    it('should throw BadRequestException if deleting Approved plan', async () => {
      const plan = { id: 1, status: 'Approved' };
      mockRepo.findOne.mockResolvedValue(plan);

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });
  });
});
