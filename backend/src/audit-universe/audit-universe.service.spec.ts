import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditUniverseService } from './audit-universe.service';
import { AuditUniverse } from './entities/audit-universe.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';

describe('AuditUniverseService', () => {
  let service: AuditUniverseService;

  const mockUniverseRepo = {
    create: jest.fn().mockImplementation((dto) => ({ ...dto })),
    save: jest
      .fn()
      .mockImplementation((entity) =>
        Promise.resolve({ id: entity.id || 1, ...entity }),
      ),
    find: jest.fn().mockResolvedValue([]),
    findOneBy: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockFindingRepo = {
    find: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditUniverseService,
        {
          provide: getRepositoryToken(AuditUniverse),
          useValue: mockUniverseRepo,
        },
        {
          provide: getRepositoryToken(AuditFinding),
          useValue: mockFindingRepo,
        },
      ],
    }).compile();

    service = module.get<AuditUniverseService>(AuditUniverseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return list of audit universe entities ordered by riskScore DESC', async () => {
      const mockList = [{ id: 1, name: 'Chi nhánh Hà Nội', riskScore: 4.2 }];
      mockUniverseRepo.find.mockResolvedValue(mockList);

      const result = await service.findAll();
      expect(result).toEqual(mockList);
      expect(mockUniverseRepo.find).toHaveBeenCalledWith({
        order: { riskScore: 'DESC' },
      });
    });
  });

  describe('recalculate', () => {
    it('should calculate past findings score and determine dynamic risk rating', async () => {
      const mockEntity: any = {
        id: 1,
        name: 'Quy trình Cấp tín dụng',
        auditCategory: 'QuyTrinh',
        scoreDetails: {
          residualRisk: 4.0,
          size: 4.0,
          findings: 4.0,
          changes: 3.0,
          regulatory: 4.0,
          auditGap: 3.0,
          boardInterest: 4.0,
          fraud: 3.0,
        },
      };

      mockUniverseRepo.findOneBy.mockResolvedValue(mockEntity);
      mockFindingRepo.find.mockResolvedValue([
        { id: 1, riskLevel: 'Critical' },
        { id: 2, riskLevel: 'High' },
      ]);

      const result = await service.recalculate(1);
      expect(result).toBeDefined();
      expect(result?.pastFindingsScore).toBe(4.0); // 10 + 5 = 15 points (<=20 points -> 4.0)
      expect(result?.riskScore).toBeGreaterThanOrEqual(3.25);
      expect(result?.dynamicRiskRating).toBeDefined();
      expect(mockUniverseRepo.save).toHaveBeenCalled();
    });

    it('should calculate Layer 2 branch score using retail/corporate/ops combination', async () => {
      const mockBranch: any = {
        id: 2,
        name: 'Chi nhánh TP.HCM',
        auditCategory: 'ChiNhanh',
        scoreDetails: {
          retail: 4.5,
          corporate: 3.0,
          operations: 3.0,
          generalManagement: 3.5,
        },
      };

      mockUniverseRepo.findOneBy.mockResolvedValue(mockBranch);
      mockFindingRepo.find.mockResolvedValue([]);

      const result = await service.recalculate(2);
      expect(result).toBeDefined();
      expect(result?.pastFindingsScore).toBe(1.0); // 0 points -> 1.0
      expect(result?.riskScore).toBeDefined();
      expect(mockUniverseRepo.save).toHaveBeenCalled();
    });
  });

  describe('transferRisk', () => {
    it('should transfer risk score, history and unclosed findings to target entity', async () => {
      const source: any = {
        id: 10,
        name: 'PGD Cầu Giấy',
        departmentCode: 'PGD_CG',
        riskScore: 3.8,
        pastFindingsScore: 3.0,
        operationalRiskScore: 3.5,
      };
      const target: any = {
        id: 20,
        name: 'Chi nhánh Cầu Giấy',
        departmentCode: 'CN_CG',
        pastFindingsScore: 1.0,
        operationalRiskScore: 2.0,
      };

      mockUniverseRepo.findOneBy.mockImplementation(({ id }) => {
        if (id === 10) return Promise.resolve(source);
        if (id === 20) return Promise.resolve(target);
        return Promise.resolve(null);
      });

      mockFindingRepo.find.mockResolvedValue([
        { id: 101, status: 'Open', businessProcessId: 10 },
        { id: 102, status: 'Closed', businessProcessId: 10 },
      ]);

      const result = await service.transferRisk(
        10,
        20,
        'Nâng cấp PGD lên Chi nhánh',
      );
      expect(result.source.id).toBe(10);
      expect(result.updatedFindingsCount).toBe(1); // only the Open finding
      expect(mockFindingRepo.update).toHaveBeenCalledWith(
        101,
        expect.objectContaining({
          businessProcessId: 20,
          legacyBusinessProcess: 'Chi nhánh Cầu Giấy',
        }),
      );
    });

    it('should throw error if source or target universe does not exist', async () => {
      mockUniverseRepo.findOneBy.mockResolvedValue(null);
      await expect(service.transferRisk(1, 2)).rejects.toThrow(
        'Không tìm thấy đối tượng kiểm toán nguồn hoặc đích.',
      );
    });
  });
});
