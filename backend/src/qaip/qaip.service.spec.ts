import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { QaipService } from './qaip.service';
import { EqaAssessment } from './entities/eqa.entity';
import { QaipSurvey } from './entities/qaip-survey.entity';
import { IqaAssessment } from './entities/iqa-assessment.entity';

describe('QaipService', () => {
  let service: QaipService;
  let eqaRepo: any;
  let surveyRepo: any;
  let iqaRepo: any;

  beforeEach(async () => {
    eqaRepo = {
      count: jest.fn().mockResolvedValue(1),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((dto) => ({ ...dto, id: 1 })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    surveyRepo = {
      count: jest.fn().mockResolvedValue(1),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((dto) => ({ ...dto, id: 1 })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    iqaRepo = {
      count: jest.fn().mockResolvedValue(1),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, id: 1 })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      remove: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QaipService,
        { provide: getRepositoryToken(EqaAssessment), useValue: eqaRepo },
        { provide: getRepositoryToken(QaipSurvey), useValue: surveyRepo },
        { provide: getRepositoryToken(IqaAssessment), useValue: iqaRepo },
      ],
    }).compile();

    service = module.get<QaipService>(QaipService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should seed default data if tables are empty', async () => {
      eqaRepo.count.mockResolvedValue(0);
      surveyRepo.count.mockResolvedValue(0);
      iqaRepo.count.mockResolvedValue(0);

      await service.onModuleInit();
      expect(eqaRepo.save).toHaveBeenCalled();
      expect(surveyRepo.save).toHaveBeenCalled();
      expect(iqaRepo.save).toHaveBeenCalled();
    });

    it('should not seed if records already exist', async () => {
      eqaRepo.count.mockResolvedValue(2);
      surveyRepo.count.mockResolvedValue(5);
      iqaRepo.count.mockResolvedValue(1);

      await service.onModuleInit();
      expect(eqaRepo.save).not.toHaveBeenCalled();
      expect(surveyRepo.save).not.toHaveBeenCalled();
      expect(iqaRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('EQA operations', () => {
    it('should return list of EQAs sorted by dateConducted DESC', async () => {
      eqaRepo.find.mockResolvedValue([{ id: 1, title: 'EQA 2021' }]);
      const res = await service.getEqas();
      expect(res).toHaveLength(1);
      expect(eqaRepo.find).toHaveBeenCalledWith({
        order: { dateConducted: 'DESC' },
      });
    });

    it('should create new EQA assessment', async () => {
      const dto = { title: 'EQA 2026', evaluator: 'EY' };
      const res = await service.createEqa(dto);
      expect(eqaRepo.create).toHaveBeenCalledWith(dto);
      expect(eqaRepo.save).toHaveBeenCalled();
      expect(res).toBeDefined();
    });
  });

  describe('Survey operations', () => {
    it('should return list of QAIP surveys', async () => {
      surveyRepo.find.mockResolvedValue([{ id: 1 }]);
      const res = await service.getSurveys();
      expect(res).toHaveLength(1);
      expect(surveyRepo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
    });

    it('should calculate averageScore and create survey', async () => {
      const data = {
        engagementName: 'Audit Test',
        ratingProfessionalism: 4,
        ratingCommunication: 5,
        ratingValueAdded: 4,
      };

      await service.createSurvey(data);
      expect(surveyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...data,
          averageScore: 4.33,
        }),
      );
      expect(surveyRepo.save).toHaveBeenCalled();
    });

    it('should calculate survey stats', async () => {
      surveyRepo.find.mockResolvedValue([
        { averageScore: 4.5 },
        { averageScore: 3.5 },
      ]);

      const stats = await service.getSurveyStats();
      expect(stats.count).toBe(2);
      expect(stats.averageScore).toBe(4);
    });

    it('should return 0 stats if no surveys exist', async () => {
      surveyRepo.find.mockResolvedValue([]);
      const stats = await service.getSurveyStats();
      expect(stats).toEqual({ averageScore: 0, count: 0 });
    });
  });

  describe('IQA operations (IIA Standard 4.1)', () => {
    it('should get IQA list via createQueryBuilder', async () => {
      const qb = iqaRepo.createQueryBuilder();
      qb.getMany.mockResolvedValue([{ id: 1, title: 'IQA 2025' }]);

      const res = await service.getIqas(2025);
      expect(qb.where).toHaveBeenCalledWith('iqa.assessmentYear = :year', { year: 2025 });
      expect(res).toHaveLength(1);
    });

    it('should get single IQA if exists', async () => {
      iqaRepo.findOne.mockResolvedValue({ id: 1, title: 'IQA 1' });
      const res = await service.getIqa(1);
      expect(res.id).toBe(1);
    });

    it('should throw NotFoundException if IQA does not exist', async () => {
      iqaRepo.findOne.mockResolvedValue(null);
      await expect(service.getIqa(999)).rejects.toThrow(NotFoundException);
    });

    it('should create IQA with user context', async () => {
      const dto = { title: 'IQA New', assessmentYear: 2026 };
      const user = { userId: 5, fullName: 'Assessor User' };
      await service.createIqa(dto, user);
      expect(iqaRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'IQA New',
          assessorId: 5,
          assessorName: 'Assessor User',
        }),
      );
      expect(iqaRepo.save).toHaveBeenCalled();
    });

    it('should update existing IQA', async () => {
      iqaRepo.findOne.mockResolvedValue({ id: 1, title: 'Old Title' });
      const updated = await service.updateIqa(1, { title: 'New Title' });
      expect(updated.title).toBe('New Title');
      expect(iqaRepo.save).toHaveBeenCalled();
    });

    it('should delete existing IQA', async () => {
      iqaRepo.findOne.mockResolvedValue({ id: 1 });
      await service.deleteIqa(1);
      expect(iqaRepo.remove).toHaveBeenCalled();
    });

    it('should calculate IQA KPIs correctly', async () => {
      const qb = iqaRepo.createQueryBuilder();
      qb.getMany.mockResolvedValue([
        {
          overallScore: 90,
          wpFirstTimeApprovalRate: 85,
          avgReworkCount: 1.0,
          budgetVariance: 5.0,
          timelinessRate: 95.0,
          conformityLevel: 'Generally Conforms',
        },
        {
          overallScore: 80,
          wpFirstTimeApprovalRate: 75,
          avgReworkCount: 1.5,
          budgetVariance: 3.0,
          timelinessRate: 85.0,
          conformityLevel: 'Partially Conforms',
        },
      ]);

      const kpis = await service.getIqaKpis(2025);
      expect(kpis.totalAssessments).toBe(2);
      expect(kpis.avgOverallScore).toBe(85.0);
      expect(kpis.avgWpFirstTimeApprovalRate).toBe(80.0);
      expect(kpis.avgReworkCount).toBe(1.25);
      expect(kpis.avgBudgetVariance).toBe(4.0);
      expect(kpis.avgTimelinessRate).toBe(90.0);
      expect(kpis.conformityDistribution.generallyConforms).toBe(1);
      expect(kpis.conformityDistribution.partiallyConforms).toBe(1);
    });

    it('should return zeroes if no IQAs exist for KPI', async () => {
      const qb = iqaRepo.createQueryBuilder();
      qb.getMany.mockResolvedValue([]);

      const kpis = await service.getIqaKpis();
      expect(kpis.totalAssessments).toBe(0);
      expect(kpis.avgOverallScore).toBe(0);
    });
  });
});
