import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegulatoryExam } from './entities/regulatory-exam.entity';
import { RegulatoryFinding } from './entities/regulatory-finding.entity';

@Injectable()
export class RegulatoryExamsService {
  constructor(
    @InjectRepository(RegulatoryExam)
    private examRepo: Repository<RegulatoryExam>,
    @InjectRepository(RegulatoryFinding)
    private findingRepo: Repository<RegulatoryFinding>,
  ) {}

  async findAllExams() {
    return this.examRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['findings'],
    });
  }

  async findOneExam(id: number) {
    return this.examRepo.findOne({ where: { id }, relations: ['findings'] });
  }

  async createExam(data: Partial<RegulatoryExam>) {
    const exam = this.examRepo.create(data);
    return this.examRepo.save(exam);
  }

  async updateExam(id: number, data: Partial<RegulatoryExam>) {
    await this.examRepo.update(id, data);
    return this.findOneExam(id);
  }

  async deleteExam(id: number) {
    return this.examRepo.delete(id);
  }

  async createFinding(data: Partial<RegulatoryFinding>) {
    const finding = this.findingRepo.create(data);
    return this.findingRepo.save(finding);
  }

  async updateFinding(id: number, data: Partial<RegulatoryFinding>) {
    await this.findingRepo.update(id, data);
    return this.findingRepo.findOne({ where: { id } });
  }

  async deleteFinding(id: number) {
    return this.findingRepo.delete(id);
  }
}
