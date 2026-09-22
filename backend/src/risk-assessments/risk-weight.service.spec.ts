import { Test, TestingModule } from '@nestjs/testing';
import { RiskWeightService } from './risk-weight.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RiskWeight } from './entities/risk-weight.entity';
import { RiskAssessment } from './entities/risk-assessment.entity';
import { RiskAuditLog } from './entities/risk-audit-log.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('RiskWeightService', () => {
  let service: RiskWeightService;

  const mockWeightRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockAssessmentRepo = {
    findOneBy: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockAuditLogRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 100, ...dto })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskWeightService,
        { provide: getRepositoryToken(RiskWeight), useValue: mockWeightRepo },
        {
          provide: getRepositoryToken(RiskAssessment),
          useValue: mockAssessmentRepo,
        },
        {
          provide: getRepositoryToken(RiskAuditLog),
          useValue: mockAuditLogRepo,
        },
      ],
    }).compile();

    service = module.get<RiskWeightService>(RiskWeightService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw NotFoundException if assessment does not exist', async () => {
      mockAssessmentRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.create({
          assessmentId: 99,
          criteriaId: 'CRIT_1',
          weight: 0.3,
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if criteriaId already exists in assessment', async () => {
      mockAssessmentRepo.findOneBy.mockResolvedValue({ id: 1 });
      mockWeightRepo.findOne.mockResolvedValue({ id: 5, criteriaId: 'CRIT_1' });

      await expect(
        service.create({
          assessmentId: 1,
          criteriaId: 'CRIT_1',
          weight: 0.3,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create weight and recalculate total weight', async () => {
      mockAssessmentRepo.findOneBy.mockResolvedValue({ id: 1, totalScore: 5 });
      mockWeightRepo.findOne.mockResolvedValue(null);
      mockWeightRepo.find.mockResolvedValue([
        { criteriaId: 'CRIT_1', weight: 0.3 },
      ]);

      const result = await service.create(
        { assessmentId: 1, criteriaId: 'CRIT_1', weight: 0.3 },
        10,
      );

      expect(result).toBeDefined();
      expect(mockWeightRepo.save).toHaveBeenCalled();
      expect(mockAssessmentRepo.update).toHaveBeenCalled();
      expect(mockAuditLogRepo.save).toHaveBeenCalled();
    });
  });

  describe('findAllByAssessment', () => {
    it('should return weights for assessment', async () => {
      mockWeightRepo.find.mockResolvedValue([{ id: 1, criteriaId: 'CRIT_1' }]);

      const result = await service.findAllByAssessment(1);
      expect(result).toHaveLength(1);
      expect(mockWeightRepo.find).toHaveBeenCalledWith({
        where: { assessmentId: 1 },
        order: { criteriaId: 'ASC' },
        relations: ['createdBy'],
      });
    });
  });

  describe('findOne', () => {
    it('should return weight by id', async () => {
      mockWeightRepo.findOne.mockResolvedValue({ id: 1, criteriaId: 'CRIT_1' });

      const result = await service.findOne(1);
      expect(result).toEqual({ id: 1, criteriaId: 'CRIT_1' });
    });

    it('should throw NotFoundException if weight not found', async () => {
      mockWeightRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if weight not found', async () => {
      mockWeightRepo.findOneBy.mockResolvedValue(null);

      await expect(service.update(99, { weight: 0.5 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException on duplicate criteriaId', async () => {
      mockWeightRepo.findOneBy.mockResolvedValue({
        id: 1,
        assessmentId: 10,
        criteriaId: 'OLD',
      });
      mockWeightRepo.findOne.mockResolvedValue({ id: 2, criteriaId: 'NEW' });

      await expect(service.update(1, { criteriaId: 'NEW' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update weight successfully', async () => {
      const existing = {
        id: 1,
        assessmentId: 10,
        criteriaId: 'C1',
        weight: 0.2,
      };
      mockWeightRepo.findOneBy
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ ...existing, weight: 0.4 });
      mockAssessmentRepo.findOneBy.mockResolvedValue({ id: 10 });
      mockWeightRepo.find.mockResolvedValue([
        { criteriaId: 'C1', weight: 0.4 },
      ]);

      const result = await service.update(1, { weight: 0.4 }, 5);
      expect(result.weight).toBe(0.4);
      expect(mockWeightRepo.update).toHaveBeenCalled();
      expect(mockAuditLogRepo.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if weight not found', async () => {
      mockWeightRepo.findOneBy.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
    });

    it('should delete weight and recalculate', async () => {
      mockWeightRepo.findOneBy.mockResolvedValue({
        id: 1,
        assessmentId: 10,
        criteriaId: 'C1',
        weight: 0.3,
      });
      mockAssessmentRepo.findOneBy.mockResolvedValue({ id: 10 });
      mockWeightRepo.find.mockResolvedValue([]);

      const result = await service.remove(1, 5);
      expect(result).toEqual({ success: true, deletedId: 1 });
      expect(mockWeightRepo.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('recalculateTotalWeight', () => {
    it('should calculate total weight and weighted score correctly', async () => {
      mockWeightRepo.find.mockResolvedValue([
        { criteriaId: 'C1', weight: 0.6 },
        { criteriaId: 'C2', weight: 0.4 },
      ]);
      mockAssessmentRepo.findOneBy.mockResolvedValue({
        id: 10,
        totalScore: 0,
        criteriaScores: [
          { criteriaId: 'C1', score: 8 },
          { criteriaId: 'C2', score: 6 },
        ],
      });

      const result = await service.recalculateTotalWeight(10);
      expect(result.totalWeight).toBe(1.0);
      // 0.6*8 + 0.4*6 = 4.8 + 2.4 = 7.2
      expect(result.totalScore).toBe(7.2);
      expect(result.warning).toBeUndefined();
    });

    it('should return warning when total weight is not 1.0', async () => {
      mockWeightRepo.find.mockResolvedValue([
        { criteriaId: 'C1', weight: 0.5 },
      ]);
      mockAssessmentRepo.findOneBy.mockResolvedValue({
        id: 10,
        totalScore: 5,
        criteriaScores: [],
      });

      const result = await service.recalculateTotalWeight(10);
      expect(result.totalWeight).toBe(0.5);
      expect(result.warning).toContain('chưa đủ 1.0');
    });
  });
});
