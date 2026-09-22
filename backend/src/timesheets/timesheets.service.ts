import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Timesheet } from './entities/timesheet.entity';

@Injectable()
export class TimesheetsService {
  constructor(
    @InjectRepository(Timesheet)
    private repo: Repository<Timesheet>,
  ) {}

  create(createDto: any): Promise<Timesheet> {
    const entity = this.repo.create(createDto as Record<string, any>);
    return this.repo.save(entity);
  }

  findAll() {
    return this.repo.find({ order: { date: 'DESC', createdAt: 'DESC' } });
  }

  findByUser(username: string) {
    return this.repo.find({ where: { username }, order: { date: 'DESC' } });
  }

  findByStatus(status: string) {
    return this.repo.find({ where: { status }, order: { date: 'DESC' } });
  }

  findOne(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  update(id: number, updateDto: any) {
    return this.repo.update(id, updateDto);
  }

  remove(id: number) {
    return this.repo.delete(id);
  }
}
