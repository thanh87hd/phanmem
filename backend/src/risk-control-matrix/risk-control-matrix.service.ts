import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiskControlMatrix } from './entities/risk-control-matrix.entity';

@Injectable()
export class RiskControlMatrixService {
  constructor(
    @InjectRepository(RiskControlMatrix)
    private readonly rcmRepo: Repository<RiskControlMatrix>,
  ) {}

  async create(createDto: Partial<RiskControlMatrix>, user?: any) {
    const { processName, ...rest } = createDto as any;
    const rcm = this.rcmRepo.create({
      ...rest,
      legacyProcessName:
        processName || rest.legacyProcessName || 'Chưa xác định',
      legacyOwnerTeam: user?.teamCode,
    } as unknown as RiskControlMatrix);
    const saved: RiskControlMatrix = await this.rcmRepo.save(rcm);
    return {
      ...saved,
      processName: saved.legacyProcessName,
    };
  }

  async findAll(user: any) {
    const qb = this.rcmRepo.createQueryBuilder('rcm');

    const list = await qb
      .orderBy('rcm.legacyProcessName', 'ASC')
      .addOrderBy('rcm.riskName', 'ASC')
      .getMany();

    return list.map((item) => ({
      ...item,
      processName: item.legacyProcessName || (item as any).processName || '',
    }));
  }

  async findOne(id: number) {
    const rcm = await this.rcmRepo.findOne({ where: { id } });
    if (!rcm) throw new NotFoundException(`RCM with ID ${id} not found`);
    return {
      ...rcm,
      processName: rcm.legacyProcessName || (rcm as any).processName || '',
    };
  }

  async update(id: number, updateDto: Partial<RiskControlMatrix>) {
    const rcm = await this.rcmRepo.findOne({ where: { id } });
    if (!rcm) throw new NotFoundException(`RCM with ID ${id} not found`);
    const { processName, ...rest } = updateDto as any;
    if (processName !== undefined) {
      rest.legacyProcessName = processName;
    }
    Object.assign(rcm, rest);
    const saved: RiskControlMatrix = await this.rcmRepo.save(rcm);
    return {
      ...saved,
      processName: saved.legacyProcessName,
    };
  }

  async remove(id: number) {
    const rcm = await this.findOne(id);
    return this.rcmRepo.remove(rcm);
  }
}
