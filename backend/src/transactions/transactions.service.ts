import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly repo: Repository<Transaction>,
  ) {}

  async create(data: Partial<Transaction>): Promise<Transaction> {
    const transaction = this.repo.create(data);
    return this.repo.save(transaction);
  }

  async findAll(): Promise<Transaction[]> {
    return this.repo.find({ order: { transactionDate: 'DESC' } });
  }
}
