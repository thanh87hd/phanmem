import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { RcsaService } from './rcsa.service';
import { RcsaAssessment } from './entities/rcsa-assessment.entity';

describe('RcsaService', () => {
  let service: RcsaService;

  const mockRcsaRepo = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
  };

  const mockEntityManager = {
    getRepository: jest.fn().mockReturnValue({
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation((dto) => Promise.resolve(dto)),
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RcsaService,
        {
          provide: getRepositoryToken(RcsaAssessment),
          useValue: mockRcsaRepo,
        },
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    service = module.get<RcsaService>(RcsaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create an RCSA record', async () => {
    const dto = { departmentName: 'CN Hà Nội', residualRisk: 3 };
    const result = await service.createRcsa(dto);
    expect(result).toBeDefined();
    expect(mockRcsaRepo.save).toHaveBeenCalled();
  });

  it('should find RCSA by department', async () => {
    await service.findRcsaByDepartment('CN Hà Nội');
    expect(mockRcsaRepo.find).toHaveBeenCalledWith({
      where: { departmentName: 'CN Hà Nội' },
      order: { createdAt: 'DESC' },
    });
  });

  it('should calculate dynamic rerating properly', async () => {
    const results = await service.calculateDynamicRerating();
    expect(Array.isArray(results)).toBe(true);
  });
});
