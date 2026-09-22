import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ResourceCapacityService } from './resource-capacity.service';
import { StaffRoster } from './entities/staff-roster.entity';
import { ResourceDemand } from './entities/resource-demand.entity';
import { ResourceAllocation } from './entities/resource-allocation.entity';

describe('ResourceCapacityService', () => {
  let service: ResourceCapacityService;
  let staffRepo: any;
  let demandRepo: any;
  let allocRepo: any;

  beforeEach(async () => {
    staffRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
      createQueryBuilder: jest.fn(),
    };
    demandRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    allocRepo = {
      find: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 1, ...entity })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceCapacityService,
        { provide: getRepositoryToken(StaffRoster), useValue: staffRepo },
        { provide: getRepositoryToken(ResourceDemand), useValue: demandRepo },
        {
          provide: getRepositoryToken(ResourceAllocation),
          useValue: allocRepo,
        },
      ],
    }).compile();

    service = module.get<ResourceCapacityService>(ResourceCapacityService);
  });

  it('should allocate staff, update committed hours and calculate utilization %', async () => {
    const mockStaff = {
      staffId: 'STF-001',
      fullName: 'Nguyễn Văn An',
      primarySkill: 'Credit',
      skillLevel: 5,
      netAvailableHours: 1200,
      committedHours: 200,
      remainingCapacity: 1000,
      utilizationPct: 16.7,
    };
    const mockDemand = {
      demandId: 'DEM-001',
      planItemId: 'PLAN-001',
      requiredSkill: 'Credit',
      minimumSkillLevel: 4,
      quarter: 'Q2',
    };

    staffRepo.findOne.mockResolvedValue(mockStaff);
    demandRepo.findOne.mockResolvedValue(mockDemand);

    const res = await service.allocate({
      demandId: 'DEM-001',
      staffId: 'STF-001',
      allocatedHours: 400,
      quarter: 'Q2',
    });

    expect(res.allocation).toBeDefined();
    expect(mockStaff.committedHours).toBe(600);
    expect(mockStaff.remainingCapacity).toBe(600);
    expect(mockStaff.utilizationPct).toBe(50.0);
    expect(res.warning).toBeNull();
  });

  it('should flag skill gap when staff skill level is below required minimum', async () => {
    const mockStaff = {
      staffId: 'STF-005',
      fullName: 'Vũ Minh Hạnh',
      primarySkill: 'Credit',
      skillLevel: 2,
      netAvailableHours: 1200,
      committedHours: 0,
    };
    const mockDemand = {
      demandId: 'DEM-001',
      planItemId: 'PLAN-001',
      requiredSkill: 'Credit',
      minimumSkillLevel: 4,
      quarter: 'Q2',
    };

    staffRepo.findOne.mockResolvedValue(mockStaff);
    demandRepo.findOne.mockResolvedValue(mockDemand);

    const res = await service.allocate({
      demandId: 'DEM-001',
      staffId: 'STF-005',
      allocatedHours: 200,
      quarter: 'Q2',
    });

    expect(res.warning).toContain('thấp hơn yêu cầu tối thiểu');
    expect((mockStaff as any).skillGapFlag).toBeDefined();
  });
});
