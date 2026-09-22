import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditExpense } from './entities/audit-expense.entity';

@Injectable()
export class AuditExpensesService {
  constructor(
    @InjectRepository(AuditExpense)
    private readonly repo: Repository<AuditExpense>,
  ) {}

  create(dto: Partial<AuditExpense>) {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  findAll(query?: { engagementId?: number; status?: string }) {
    const where: any = {};
    if (query?.engagementId) where.engagementId = query.engagementId;
    if (query?.status) where.status = query.status;
    return this.repo.find({ where, order: { expenseDate: 'DESC' } });
  }

  findOne(id: number) {
    return this.repo.findOneBy({ id });
  }

  async getSummaryByEngagement(engagementId: number) {
    const expenses = await this.repo.find({
      where: { engagementId, status: 'Approved' },
    });
    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const byCategory: Record<string, number> = {};
    expenses.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
    });
    return { engagementId, total, byCategory, count: expenses.length };
  }

  update(id: number, dto: Partial<AuditExpense>) {
    return this.repo.update(id, dto);
  }

  remove(id: number) {
    return this.repo.delete(id);
  }
}
