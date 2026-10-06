import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditUniverseService } from './audit-universe.service';
import { AuditUniverse } from './entities/audit-universe.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';

describe('AuditUniverseService', () => {
  let service: AuditUniverseService;

  const mockUniverseRepo = {
    // findAll/findOne project the latest risk assessment through a raw query
    manager: { query: jest.fn().mockResolvedValue([]) },
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
    // clearAllMocks() keeps implementations, so re-establish deterministic defaults
    mockUniverseRepo.find.mockResolvedValue([]);
    mockUniverseRepo.findOneBy.mockResolvedValue(null);
    mockUniverseRepo.manager.query.mockResolvedValue([]);
    mockFindingRepo.find.mockResolvedValue([]);

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
    it('should return audit universe entities ordered by name ASC, augmented with the latest risk assessment projection', async () => {
      const mockList = [{ id: 1, name: 'Chi nhánh Hà Nội' }];
      mockUniverseRepo.find.mockResolvedValue(mockList);
      // riskScore / dynamicRiskRating are no longer stored on audit_universe
      // (migration RbiaPlanningHubRefactor dropped those columns); they are projected
      // from the newest row of risk_assessments.
      mockUniverseRepo.manager.query.mockResolvedValue([
        {
          id: 9,
          auditUniverseId: 1,
          residualRiskScore: 4.2,
          totalScore: 4.0,
          riskLevel: 'High',
          status: 'Approved',
          assessmentYear: 2026,
        },
        {
          id: 3,
          auditUniverseId: 1,
          residualRiskScore: 2.0,
          totalScore: 2.0,
          riskLevel: 'Low',
          status: 'Archived',
          assessmentYear: 2025,
        },
      ]);

      const result = await service.findAll();

      expect(mockUniverseRepo.find).toHaveBeenCalledWith({
        order: { name: 'ASC' },
      });
      expect(result).toEqual([
        {
          id: 1,
          name: 'Chi nhánh Hà Nội',
          riskScore: 4.2,
          dynamicRiskRating: 'High',
          riskAssessmentStatus: 'Approved',
          latestAssessmentYear: 2026,
          latestAssessmentId: 9,
        },
      ]);
    });

    it('should return null risk fields when the universe has no risk assessment', async () => {
      mockUniverseRepo.find.mockResolvedValue([
        { id: 2, name: 'Chi nhánh TP.HCM' },
      ]);
      mockUniverseRepo.manager.query.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([
        {
          id: 2,
          name: 'Chi nhánh TP.HCM',
          riskScore: null,
          dynamicRiskRating: null,
          riskAssessmentStatus: null,
          latestAssessmentYear: null,
          latestAssessmentId: null,
        },
      ]);
    });
  });

  describe('recalculate', () => {
    // The RBIA refactor (migration RbiaPlanningHubRefactor1787831200000, step 3:
    // "LOẠI BỎ ĐIỂM SỐ NHẬP TAY") dropped scoreDetails / pastFindingsScore / riskScore /
    // dynamicRiskRating from audit_universe. Risk scoring now lives in risk_assessments
    // (per-criterion scores + UnifiedRiskEngineService), so recalculate() only refreshes
    // the projection of the latest assessment instead of computing a local formula.
    it('should return the latest risk assessment score of a process (Layer 1) universe', async () => {
      const mockEntity: any = {
        id: 1,
        name: 'Quy trình Cấp tín dụng',
        auditCategory: 'QuyTrinh',
      };

      mockUniverseRepo.findOneBy.mockResolvedValue(mockEntity);
      mockUniverseRepo.manager.query.mockResolvedValue([
        {
          id: 55,
          residualRiskScore: 4.0,
          totalScore: 4.2,
          riskLevel: 'High',
          status: 'Approved',
          assessmentYear: 2026,
        },
      ]);

      const result = await service.recalculate(1);

      expect(result).toBeDefined();
      expect(mockUniverseRepo.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(result.riskScore).toBe(4.0); // residualRiskScore takes precedence over totalScore
      expect(result.dynamicRiskRating).toBe('High');
      expect(result.riskAssessmentStatus).toBe('Approved');
      expect(result.latestAssessmentYear).toBe(2026);
      expect(result.latestAssessmentId).toBe(55);
      // Removed legacy locally-computed fields must not reappear
      expect(result.pastFindingsScore).toBeUndefined();
      expect(result.scoreDetails).toBeUndefined();
      // recalculate is a read-only projection refresh: nothing is persisted any more
      expect(mockUniverseRepo.save).not.toHaveBeenCalled();
    });

    it('should return the latest assessment score of a Layer 2 branch universe, falling back to totalScore', async () => {
      const mockBranch: any = {
        id: 2,
        name: 'Chi nhánh TP.HCM',
        auditCategory: 'ChiNhanh',
        layer: 2,
      };

      mockUniverseRepo.findOneBy.mockResolvedValue(mockBranch);
      mockUniverseRepo.manager.query.mockResolvedValue([
        {
          id: 77,
          residualRiskScore: null, // NULL -> use totalScore (see findOne: ?? )
          totalScore: 3.25,
          riskLevel: 'Medium',
          status: 'Approved',
          assessmentYear: 2026,
        },
      ]);

      const result = await service.recalculate(2);

      expect(result).toBeDefined();
      expect(result.riskScore).toBe(3.25);
      expect(result.dynamicRiskRating).toBe('Medium');
      expect(result.latestAssessmentId).toBe(77);
      expect(mockUniverseRepo.save).not.toHaveBeenCalled();
    });

    it('should return null when the universe does not exist', async () => {
      mockUniverseRepo.findOneBy.mockResolvedValue(null);

      await expect(service.recalculate(999)).resolves.toBeNull();
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
