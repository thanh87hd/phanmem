import { Test, TestingModule } from '@nestjs/testing';
import { QualityReviewsService } from './quality-reviews.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QualityReview } from './entities/quality-review.entity';
import { QualityAssessment } from './entities/quality-assessment.entity';
import { ReviewAction } from './entities/review-action.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';

describe('QualityReviewsService', () => {
  let service: QualityReviewsService;

  const mockRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockAssessmentRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 10, ...dto })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockEngagementRepo = {};

  const mockActionRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 20, ...dto })),
    find: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QualityReviewsService,
        { provide: getRepositoryToken(QualityReview), useValue: mockRepo },
        {
          provide: getRepositoryToken(QualityAssessment),
          useValue: mockAssessmentRepo,
        },
        {
          provide: getRepositoryToken(AuditEngagement),
          useValue: mockEngagementRepo,
        },
        { provide: getRepositoryToken(ReviewAction), useValue: mockActionRepo },
      ],
    }).compile();

    service = module.get<QualityReviewsService>(QualityReviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('CRUD on QualityReview', () => {
    it('should create a quality review', async () => {
      const result = await service.create({ workingPaperId: 5 });
      expect(result).toBeDefined();
      expect(mockRepo.create).toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should findAll quality reviews', async () => {
      mockRepo.find.mockResolvedValue([{ id: 1 }]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });

    it('should findByWorkingPaper', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 1, workingPaperId: 10 });
      const result = await service.findByWorkingPaper(10);
      expect(result).toEqual({ id: 1, workingPaperId: 10 });
    });

    it('should update quality review', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 1, overallStatus: 'Draft' });
      const result = await service.update(1, { overallStatus: 'Draft' });
      expect(result).toBeDefined();
      expect(mockRepo.update).toHaveBeenCalledWith(1, {
        overallStatus: 'Draft',
      });
    });

    it('should remove quality review', async () => {
      await service.remove(1);
      expect(mockRepo.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('transition', () => {
    it('should throw error if Quality Review not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.transition(999, 'self', 'Approved')).rejects.toThrow(
        'Quality Review not found',
      );
    });

    it('should transition self review level', async () => {
      const qr = { id: 1, workingPaperId: 10, selfReviewStatus: 'Pending' };
      mockRepo.findOne.mockResolvedValue(qr);

      const result = await service.transition(
        1,
        'self',
        'Approved',
        'Self note',
        5,
        'User 5',
      );
      expect(result.selfReviewStatus).toBe('Approved');
      expect(result.selfReviewNotes).toBe('Self note');
      expect(mockActionRepo.save).toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should approve overallStatus when independentReviewStatus is Approved', async () => {
      const qr = {
        id: 1,
        workingPaperId: 10,
        independentReviewStatus: 'Pending',
      };
      mockRepo.findOne.mockResolvedValue(qr);

      const result = await service.transition(1, 'independent', 'Approved');
      expect(result.overallStatus).toBe('Approved');
    });

    it('should reject overallStatus when supervisor rejects', async () => {
      const qr = {
        id: 1,
        workingPaperId: 10,
        supervisorReviewStatus: 'Pending',
      };
      mockRepo.findOne.mockResolvedValue(qr);

      const result = await service.transition(1, 'supervisor', 'Rejected');
      expect(result.overallStatus).toBe('Rejected');
    });
  });

  describe('Engagement Quality Assessments', () => {
    it('should calculateOverallScore and rating correctly', () => {
      // 90*0.25 + 80*0.35 + 85*0.25 + 70*0.15 = 22.5 + 28 + 21.25 + 10.5 = 82.25
      const score = service.calculateOverallScore({
        planning: 90,
        execution: 80,
        reporting: 85,
        documentation: 70,
      });
      expect(score).toBe(82.25);
      expect(service.getRatingFromScore(score)).toBe('Good');
      expect(service.getRatingFromScore(95)).toBe('Excellent');
      expect(service.getRatingFromScore(65)).toBe('Needs Improvement');
      expect(service.getRatingFromScore(40)).toBe('Unsatisfactory');
    });

    it('should createAssessment with calculated score and rating', async () => {
      const dto = {
        engagementId: 10,
        criteriaScores: {
          planning: 90,
          execution: 90,
          reporting: 90,
          documentation: 90,
        },
      };

      const result = await service.createAssessment(dto);
      expect(result).toBeDefined();
      expect(mockAssessmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          overallScore: 90,
          rating: 'Excellent',
        }),
      );
    });

    it('should getOverallQualityStats when empty', async () => {
      mockAssessmentRepo.find.mockResolvedValue([]);
      const stats = await service.getOverallQualityStats();
      expect(stats.totalAssessed).toBe(0);
      expect(stats.averageScore).toBe(0);
    });

    it('should getOverallQualityStats with multiple assessments', async () => {
      mockAssessmentRepo.find.mockResolvedValue([
        {
          overallScore: 90,
          rating: 'Excellent',
          criteriaScores: {
            planning: 90,
            execution: 90,
            reporting: 90,
            documentation: 90,
          },
        },
        {
          overallScore: 80,
          rating: 'Good',
          criteriaScores: {
            planning: 80,
            execution: 80,
            reporting: 80,
            documentation: 80,
          },
        },
      ]);

      const stats = await service.getOverallQualityStats();
      expect(stats.totalAssessed).toBe(2);
      expect(stats.averageScore).toBe(85);
      expect(stats.ratingDistribution.Excellent).toBe(1);
      expect(stats.ratingDistribution.Good).toBe(1);
      expect(stats.criteriaAverages.planning).toBe(85);
    });

    it('should deleteAssessment', async () => {
      const result = await service.deleteAssessment(1);
      expect(result).toEqual({ success: true });
      expect(mockAssessmentRepo.delete).toHaveBeenCalledWith(1);
    });
  });
});
