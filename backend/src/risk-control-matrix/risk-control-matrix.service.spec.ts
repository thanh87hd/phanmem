import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { RiskControlMatrixService } from './risk-control-matrix.service';
import { RiskControlMatrix } from './entities/risk-control-matrix.entity';

describe('RiskControlMatrixService', () => {
  let service: RiskControlMatrixService;
  let rcmRepo: any;

  beforeEach(async () => {
    const mockQb = {
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    rcmRepo = {
      create: jest.fn((dto) => ({ ...dto, id: 1 })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      findOne: jest.fn().mockResolvedValue(null),
      remove: jest.fn((entity) => Promise.resolve(entity)),
      createQueryBuilder: jest.fn(() => mockQb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskControlMatrixService,
        { provide: getRepositoryToken(RiskControlMatrix), useValue: rcmRepo },
      ],
    }).compile();

    service = module.get<RiskControlMatrixService>(RiskControlMatrixService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create RCM matrix entity with user teamCode', async () => {
    const dto = {
      riskName: 'Rủi ro tín dụng',
      controlName: 'Kiểm soát phê duyệt',
    };
    const user = { teamCode: 'TEAM_CREDIT' };

    const res = await service.create(dto, user);
    expect(rcmRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        riskName: 'Rủi ro tín dụng',
        legacyOwnerTeam: 'TEAM_CREDIT',
      }),
    );
    expect(rcmRepo.save).toHaveBeenCalled();
    expect(res.id).toBe(1);
  });

  it('should find all RCMs ordered by process and risk', async () => {
    const qb = rcmRepo.createQueryBuilder();
    qb.getMany.mockResolvedValue([{ id: 1 }]);

    const res = await service.findAll(null);
    expect(res).toHaveLength(1);
    expect(qb.orderBy).toHaveBeenCalledWith('rcm.legacyProcessName', 'ASC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('rcm.riskName', 'ASC');
  });

  it('should throw NotFoundException if RCM not found', async () => {
    rcmRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });

  it('should update RCM', async () => {
    rcmRepo.findOne.mockResolvedValue({ id: 1, riskName: 'Old Risk' });
    const res = await service.update(1, { riskName: 'Updated Risk' });
    expect(res.riskName).toBe('Updated Risk');
    expect(rcmRepo.save).toHaveBeenCalled();
  });

  it('should remove RCM', async () => {
    const mockRcm = { id: 1, riskName: 'Risk 1', legacyProcessName: 'TD' };
    rcmRepo.findOne.mockResolvedValue(mockRcm);
    const res = await service.remove(1);
    expect(rcmRepo.remove).toHaveBeenCalledWith({
      ...mockRcm,
      processName: 'TD',
    });
    expect(res).toEqual({
      ...mockRcm,
      processName: 'TD',
    });
  });
});
