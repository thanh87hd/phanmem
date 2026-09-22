import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditExpensesService } from './audit-expenses.service';
import { AuditExpense } from './entities/audit-expense.entity';

describe('AuditExpensesService', () => {
  let service: AuditExpensesService;
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
        AuditExpensesService,
        { provide: getRepositoryToken(AuditExpense), useValue: repo },
      ],
    }).compile();

    service = module.get<AuditExpensesService>(AuditExpensesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create, findAll, findOne, update, remove', () => {
    it('should create audit expense', async () => {
      const dto = {
        engagementId: 1,
        amount: 2000000,
        category: 'Công tác phí',
      };
      const res = await service.create(dto);
      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(repo.save).toHaveBeenCalled();
      expect(res.id).toBe(1);
    });

    it('should find all with query filters', async () => {
      repo.find.mockResolvedValue([
        { id: 1, engagementId: 5, status: 'Approved' },
      ]);
      const res = await service.findAll({
        engagementId: 5,
        status: 'Approved',
      });
      expect(res).toHaveLength(1);
      expect(repo.find).toHaveBeenCalledWith({
        where: { engagementId: 5, status: 'Approved' },
        order: { expenseDate: 'DESC' },
      });
    });

    it('should find one by id', async () => {
      repo.findOneBy.mockResolvedValue({ id: 1 });
      const res = await service.findOne(1);
      expect(res?.id).toBe(1);
    });

    it('should update expense', async () => {
      await service.update(1, { status: 'Approved' });
      expect(repo.update).toHaveBeenCalledWith(1, { status: 'Approved' });
    });

    it('should remove expense', async () => {
      await service.remove(1);
      expect(repo.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('getSummaryByEngagement', () => {
    it('should aggregate approved expenses by category and total', async () => {
      const mockApproved = [
        { id: 1, engagementId: 10, category: 'Vé máy bay', amount: 5000000 },
        { id: 2, engagementId: 10, category: 'Khách sạn', amount: 3000000 },
        { id: 3, engagementId: 10, category: 'Vé máy bay', amount: 2000000 },
      ];
      repo.find.mockResolvedValue(mockApproved);

      const summary = await service.getSummaryByEngagement(10);
      expect(summary.engagementId).toBe(10);
      expect(summary.total).toBe(10000000);
      expect(summary.count).toBe(3);
      expect(summary.byCategory['Vé máy bay']).toBe(7000000);
      expect(summary.byCategory['Khách sạn']).toBe(3000000);
    });
  });
});
