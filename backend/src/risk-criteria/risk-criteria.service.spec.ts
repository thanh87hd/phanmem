import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RiskCriteriaService } from './risk-criteria.service';
import { RiskCriterion } from './entities/risk-criterion.entity';

describe('RiskCriteriaService', () => {
  let service: RiskCriteriaService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      create: jest.fn((dto) => ({ ...dto, id: 1 })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      find: jest.fn().mockResolvedValue([]),
      findOneBy: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskCriteriaService,
        { provide: getRepositoryToken(RiskCriterion), useValue: repo },
      ],
    }).compile();

    service = module.get<RiskCriteriaService>(RiskCriteriaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create risk criterion', async () => {
    const dto = {
      name: 'Quy mô dư nợ',
      auditCategory: 'DVKD',
      weight: 20,
    } as any;
    const res = await service.create(dto);
    expect(repo.create).toHaveBeenCalledWith(dto);
    expect(repo.save).toHaveBeenCalled();
    expect(res.id).toBe(1);
  });

  it('should find all with auditCategory filter', async () => {
    repo.find.mockResolvedValue([{ id: 1, auditCategory: 'DVKD' }]);
    const res = await service.findAll('DVKD');
    expect(res).toHaveLength(1);
    expect(repo.find).toHaveBeenCalledWith({
      where: { auditCategory: 'DVKD' },
    });
  });

  it('should find all without filter', async () => {
    repo.find.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const res = await service.findAll();
    expect(res).toHaveLength(2);
    expect(repo.find).toHaveBeenCalledWith();
  });

  it('should find one by id', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1 });
    const res = await service.findOne(1);
    expect(res?.id).toBe(1);
  });

  it('should update risk criterion', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, name: 'Updated' });
    const res = await service.update(1, { name: 'Updated' });
    expect(repo.update).toHaveBeenCalledWith(1, { name: 'Updated' });
    expect(res?.name).toBe('Updated');
  });

  it('should remove risk criterion', async () => {
    const res = await service.remove(1);
    expect(repo.delete).toHaveBeenCalledWith(1);
    expect(res).toEqual({ success: true });
  });
});
