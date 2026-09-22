import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TestOfControlService } from './test-of-control.service';
import { TestOfControl } from './entities/test-of-control.entity';
import { ControlException } from './entities/control-exception.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';

describe('TestOfControlService', () => {
  let service: TestOfControlService;
  let tocRepo: any;
  let excRepo: any;
  let findingRepo: any;

  beforeEach(async () => {
    tocRepo = {
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 1, ...entity })),
      findOne: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    excRepo = {
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 1, ...entity })),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    findingRepo = {
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 10, ...entity })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestOfControlService,
        { provide: getRepositoryToken(TestOfControl), useValue: tocRepo },
        { provide: getRepositoryToken(ControlException), useValue: excRepo },
        { provide: getRepositoryToken(AuditFinding), useValue: findingRepo },
      ],
    }).compile();

    service = module.get<TestOfControlService>(TestOfControlService);
  });

  it('should calculate exception rate and suggestedResult = Pass when under threshold', async () => {
    const result = await service.create({
      testId: 'TEST-001',
      itemsTested: 100,
      validExceptions: 2,
      tolerableRate: 0.05,
      materialException: 'N',
    });

    expect(result.exceptionRate).toBe(0.02);
    expect(result.suggestedResult).toBe('Pass');
    expect(result.finalResult).toBe('Pass');
  });

  it('should set suggestedResult = Fail when exception rate exceeds tolerable rate', async () => {
    const result = await service.create({
      testId: 'TEST-002',
      itemsTested: 100,
      validExceptions: 10,
      tolerableRate: 0.05,
      materialException: 'N',
    });

    expect(result.exceptionRate).toBe(0.1);
    expect(result.suggestedResult).toBe('Fail');
    expect(result.finalResult).toBe('Fail');
  });

  it('should set suggestedResult = Fail when materialException = Y regardless of rate', async () => {
    const result = await service.create({
      testId: 'TEST-003',
      itemsTested: 1000,
      validExceptions: 1,
      tolerableRate: 0.05,
      materialException: 'Y',
    });

    expect(result.exceptionRate).toBe(0.001);
    expect(result.suggestedResult).toBe('Fail');
  });

  it('should generate finding from exception and link issueId back', async () => {
    const mockExc = {
      id: 1,
      exceptionId: 'EXC-001',
      testId: 'TEST-001',
      exceptionDescription: 'Vượt hạn mức tín dụng',
      criteriaBreached: 'Quy chế tín dụng',
      financialExposure: 10000000000,
      regulatoryImpact: 'Y',
    };
    excRepo.findOne.mockResolvedValue(mockExc);

    const mockTest = {
      testId: 'TEST-001',
      controlId: 'CTRL-01',
      controlDescription: 'Hạn mức',
      issueRequired: 'N',
      issueId: null,
    };
    tocRepo.findOne.mockResolvedValue(mockTest);

    const finding = await service.generateFindingFromException('EXC-001');

    expect(findingRepo.create).toHaveBeenCalled();
    expect(findingRepo.save).toHaveBeenCalled();
    expect((mockExc as any).issueId).toBeDefined();
    expect(excRepo.save).toHaveBeenCalledWith(mockExc);
    expect(mockTest.issueRequired).toBe('Y');
    expect(tocRepo.save).toHaveBeenCalledWith(mockTest);
  });
});
