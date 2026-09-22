import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { KriAlertsService } from './kri-alerts.service';
import { KriAlert } from './entities/kri-alert.entity';
import { AuditUniverse } from '../audit-universe/entities/audit-universe.entity';

describe('KriAlertsService', () => {
  let service: KriAlertsService;

  const mockKriAlert: Partial<KriAlert> = {
    id: 1,
    kriCode: 'KRI_NPL_01',
    kriName: 'Tỷ lệ nợ xấu trên tổng dư nợ',
    metrics: 'NPL Ratio',
    category: 'Tín dụng',
    severity: 'Critical',
    status: 'Active',
    observedValue: '3.5%',
    currentValue: '3.5%',
    thresholdValue: '2.0%',
    reportMonth: 8,
    reportYear: 2026,
    departmentCode: 'CN_HN',
    departmentName: 'Chi nhánh Hà Nội',
    auditUniverseId: 10,
  };

  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockKriAlert]),
  };

  const mockKriRepo = {
    create: jest
      .fn()
      .mockImplementation((dto) =>
        Array.isArray(dto)
          ? dto.map((d, i) => ({ ...d, id: i + 1 }))
          : { ...dto, id: 1 },
      ),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    find: jest.fn().mockResolvedValue([mockKriAlert]),
    findOne: jest.fn().mockResolvedValue(mockKriAlert),
    remove: jest.fn().mockResolvedValue(mockKriAlert),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockUniverseRepo = {
    find: jest
      .fn()
      .mockResolvedValue([
        { id: 10, name: 'Chi nhánh Hà Nội', departmentCode: 'CN_HN' },
      ]),
  };

  const mockEntityManager = {
    getRepository: jest.fn().mockImplementation((entity) => {
      if (entity === AuditUniverse) return mockUniverseRepo;
      return mockKriRepo;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KriAlertsService,
        {
          provide: getRepositoryToken(KriAlert),
          useValue: mockKriRepo,
        },
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    service = module.get<KriAlertsService>(KriAlertsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createKriAlert', () => {
    it('should normalize observedValue and currentValue and save alert', async () => {
      const dto = {
        kriCode: 'KRI_NPL_01',
        metrics: 'Tỷ lệ nợ xấu',
        severity: 'High',
        currentValue: '3.5%',
        threshold: '2.0%',
      };

      const result = await service.createKriAlert(dto as any);
      expect(result).toBeDefined();
      expect(mockKriRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          observedValue: '3.5%',
          currentValue: '3.5%',
          thresholdValue: '2.0%',
          threshold: '2.0%',
        }),
      );
      expect(mockKriRepo.save).toHaveBeenCalled();
    });
  });

  describe('findAllKriAlerts and findActiveKriAlerts', () => {
    it('should query all alerts', async () => {
      const result = await service.findAllKriAlerts();
      expect(result).toEqual([mockKriAlert]);
      expect(mockKriRepo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        relations: ['auditUniverse'],
      });
    });

    it('should query active alerts', async () => {
      const result = await service.findActiveKriAlerts();
      expect(result).toEqual([mockKriAlert]);
      expect(mockKriRepo.find).toHaveBeenCalledWith({
        where: { status: 'Active' },
        order: { createdAt: 'DESC' },
        relations: ['auditUniverse'],
      });
    });
  });
});
