import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ResourceAllocationService } from './resource-allocation.service';
import { AuditSchedule } from '../../audit-schedules/entities/audit-schedule.entity';
import { AuditEngagement } from '../../audit-engagements/entities/audit-engagement.entity';
import { User } from '../../users/entities/user.entity';
import { AuditFinding } from '../../audit-findings/entities/audit-finding.entity';
import { LoopholeDetectionService } from './loophole-detection.service';

describe('ResourceAllocationService', () => {
  let service: ResourceAllocationService;
  let scheduleRepo: any;
  let engagementRepo: any;
  let userRepo: any;
  let findingRepo: any;
  let loopholeDetectionService: any;

  beforeEach(async () => {
    scheduleRepo = {
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((dto) => ({
        ...dto,
        id: Math.floor(Math.random() * 1000),
      })),
      save: jest.fn((entities) => Promise.resolve(entities)),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
    };

    engagementRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    userRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    findingRepo = {
      save: jest.fn().mockResolvedValue([]),
    };

    loopholeDetectionService = {
      runAiLoopholeDetection: jest
        .fn()
        .mockResolvedValue({ success: true, detected: 2 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceAllocationService,
        { provide: getRepositoryToken(AuditSchedule), useValue: scheduleRepo },
        {
          provide: getRepositoryToken(AuditEngagement),
          useValue: engagementRepo,
        },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(AuditFinding), useValue: findingRepo },
        {
          provide: LoopholeDetectionService,
          useValue: loopholeDetectionService,
        },
      ],
    }).compile();

    service = module.get<ResourceAllocationService>(ResourceAllocationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('runStressTest', () => {
    it('should generate findings and call loophole detection', async () => {
      const result = await service.runStressTest(50);
      expect(
        loopholeDetectionService.runAiLoopholeDetection,
      ).toHaveBeenCalled();
      expect(result.totalProcessed).toBe(50);
      expect(result.detectedLoopholes).toBe(2);
      expect(result.rating).toBe('Excellent');
    });

    it('should save findings in batches when count exceeds 500', async () => {
      await service.runStressTest(550);
      expect(findingRepo.save).toHaveBeenCalled();
    });
  });

  describe('allocateResources', () => {
    it('should return success with count 0 when no planning engagements found', async () => {
      engagementRepo.find.mockResolvedValue([]);
      const result = await service.allocateResources(2026);
      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
    });

    it('should return error when no active users found', async () => {
      engagementRepo.find.mockResolvedValue([
        {
          id: 1,
          name: 'Audit Q1',
          status: 'Planning',
          startDate: '2026-03-01',
          endDate: '2026-03-15',
          ownerTeam: 'TEAM_A',
        },
      ]);
      userRepo.find.mockResolvedValue([]);

      const result = await service.allocateResources(2026);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Không có nhân sự');
    });

    it('should propose lead, members, and backup schedules for valid engagements', async () => {
      const mockEngagements = [
        {
          id: 10,
          name: 'Kiểm toán Tín dụng Chi nhánh HCM',
          status: 'Planning',
          startDate: '2026-04-01',
          endDate: '2026-04-15',
          ownerTeam: 'TEAM_CREDIT',
          branchName: 'Chi nhánh HCM',
        },
      ];

      const mockUsers = [
        {
          id: 1,
          fullName: 'Trần Trưởng Lead',
          teamCode: 'TEAM_CREDIT',
          jobTitle: 'Trưởng nhóm KT',
          isActive: true,
        },
        {
          id: 2,
          fullName: 'Lê Thành Viên 1',
          teamCode: 'TEAM_CREDIT',
          jobTitle: 'Kiểm toán viên',
          isActive: true,
        },
        {
          id: 3,
          fullName: 'Nguyễn Thành Viên 2',
          teamCode: 'TEAM_CREDIT',
          jobTitle: 'Kiểm toán viên',
          isActive: true,
        },
        {
          id: 4,
          fullName: 'Phạm Dự Phòng',
          teamCode: 'TEAM_CREDIT',
          jobTitle: 'Kiểm toán viên',
          isActive: true,
        },
      ];

      engagementRepo.find.mockResolvedValue(mockEngagements);
      userRepo.find.mockResolvedValue(mockUsers);

      const result = await service.allocateResources(2026);

      expect(scheduleRepo.delete).toHaveBeenCalledWith({ status: 'Proposed' });
      expect(scheduleRepo.save).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.engagementsAllocated).toBe(1);
      expect(result.schedulesProposedCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('approveAnnualPlan', () => {
    it('should return false if no proposed schedules exist', async () => {
      scheduleRepo.find.mockResolvedValue([]);
      const result = await service.approveAnnualPlan();
      expect(result.success).toBe(false);
      expect(result.message).toContain('Không tìm thấy');
    });

    it('should convert proposed schedules to planned and update engagements', async () => {
      const mockProposed = [
        {
          id: 101,
          engagementId: 1,
          userId: 1,
          userName: 'Trưởng Lead',
          role: 'Trưởng đoàn kiểm toán',
          status: 'Proposed',
          startDate: '2026-05-01',
          endDate: '2026-05-15',
          isBackup: false,
        },
        {
          id: 102,
          engagementId: 1,
          userId: 2,
          userName: 'KTV Thành viên',
          role: 'Thành viên',
          status: 'Proposed',
          startDate: '2026-05-01',
          endDate: '2026-05-15',
          isBackup: false,
        },
      ];

      scheduleRepo.find.mockResolvedValue(mockProposed);
      engagementRepo.findOne.mockResolvedValue({
        id: 1,
        name: 'Cuộc KT Demo',
        leadAuditorId: null,
        teamMembers: [],
      });

      const result = await service.approveAnnualPlan();

      expect(result.success).toBe(true);
      expect(mockProposed[0].status).toBe('Planned');
      expect(mockProposed[1].status).toBe('Planned');
      expect(engagementRepo.save).toHaveBeenCalled();
      expect(result.engagementsSyncedCount).toBe(1);
    });
  });
});
