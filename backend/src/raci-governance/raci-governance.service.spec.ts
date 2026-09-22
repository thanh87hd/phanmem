import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RaciGovernanceService } from './raci-governance.service';
import { AuditProcess } from './entities/audit-process.entity';
import { ProcessActivity } from './entities/process-activity.entity';
import { RaciAssignment } from './entities/raci-assignment.entity';

describe('RaciGovernanceService', () => {
  let service: RaciGovernanceService;
  let processRepo: any;
  let activityRepo: any;
  let raciRepo: any;

  beforeEach(async () => {
    processRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    activityRepo = {
      find: jest.fn(),
    };
    raciRepo = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RaciGovernanceService,
        { provide: getRepositoryToken(AuditProcess), useValue: processRepo },
        {
          provide: getRepositoryToken(ProcessActivity),
          useValue: activityRepo,
        },
        { provide: getRepositoryToken(RaciAssignment), useValue: raciRepo },
      ],
    }).compile();

    service = module.get<RaciGovernanceService>(RaciGovernanceService);
  });

  it('should pass with 100% compliance when activities have 1 A and 1+ R', async () => {
    activityRepo.find.mockResolvedValue([
      {
        activityId: 'ACT-001',
        activityName: 'Test',
        activityType: 'Execution',
      },
    ]);
    raciRepo.find.mockResolvedValue([
      {
        activityId: 'ACT-001',
        roleId: 'R1',
        roleName: 'Role 1',
        raciCode: 'R',
      },
      {
        activityId: 'ACT-001',
        roleId: 'R2',
        roleName: 'Role 2',
        raciCode: 'A',
      },
    ]);

    const result = await service.runQaRaciChecks('PROC-001');

    expect(result.status).toBe('Compliant');
    expect(result.complianceRate).toBe(100);
    expect(result.violationsCount).toBe(0);
  });

  it('should flag Rule 1 violation when activity has 0 A', async () => {
    activityRepo.find.mockResolvedValue([
      {
        activityId: 'ACT-001',
        activityName: 'Test',
        activityType: 'Execution',
      },
    ]);
    raciRepo.find.mockResolvedValue([
      {
        activityId: 'ACT-001',
        roleId: 'R1',
        roleName: 'Role 1',
        raciCode: 'R',
      },
    ]);

    const result = await service.runQaRaciChecks('PROC-001');

    expect(result.status).toBe('Non-Compliant');
    expect(result.violationsCount).toBe(1);
    expect(result.violations[0].ruleCode).toBe('QA-RACI-01');
    expect(result.violations[0].severity).toBe('Critical');
  });

  it('should flag Rule 2 violation when activity has 0 R', async () => {
    activityRepo.find.mockResolvedValue([
      {
        activityId: 'ACT-001',
        activityName: 'Test',
        activityType: 'Execution',
      },
    ]);
    raciRepo.find.mockResolvedValue([
      {
        activityId: 'ACT-001',
        roleId: 'R2',
        roleName: 'Role 2',
        raciCode: 'A',
      },
    ]);

    const result = await service.runQaRaciChecks('PROC-001');

    expect(result.violations.some((v) => v.ruleCode === 'QA-RACI-02')).toBe(
      true,
    );
  });

  it('should flag Rule 3 (SoD conflict) when same role is both R and A on Approval step', async () => {
    activityRepo.find.mockResolvedValue([
      {
        activityId: 'ACT-002',
        activityName: 'Phê duyệt',
        activityType: 'Approval',
      },
    ]);
    raciRepo.find.mockResolvedValue([
      {
        activityId: 'ACT-002',
        roleId: 'R1',
        roleName: 'Trưởng phòng',
        raciCode: 'R',
      },
      {
        activityId: 'ACT-002',
        roleId: 'R1',
        roleName: 'Trưởng phòng',
        raciCode: 'A',
      },
    ]);

    const result = await service.runQaRaciChecks('PROC-001');

    expect(result.violations.some((v) => v.ruleCode === 'QA-RACI-03')).toBe(
      true,
    );
  });
});
