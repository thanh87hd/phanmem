import { Injectable } from '@nestjs/common';
import { CreateRiskCriterionDto } from './dto/create-risk-criterion.dto';
import { UpdateRiskCriterionDto } from './dto/update-risk-criterion.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiskCriterion } from './entities/risk-criterion.entity';

@Injectable()
export class RiskCriteriaService {
  constructor(
    @InjectRepository(RiskCriterion)
    private readonly riskCriterionRepository: Repository<RiskCriterion>,
  ) {}

  create(createRiskCriterionDto: CreateRiskCriterionDto) {
    const criterion = this.riskCriterionRepository.create(
      createRiskCriterionDto,
    );
    return this.riskCriterionRepository.save(criterion);
  }

  findAll(auditCategory?: string) {
    if (auditCategory) {
      return this.riskCriterionRepository.find({ where: { auditCategory } });
    }
    return this.riskCriterionRepository.find();
  }

  findOne(id: number) {
    return this.riskCriterionRepository.findOneBy({ id });
  }

  async update(id: number, updateRiskCriterionDto: UpdateRiskCriterionDto) {
    await this.riskCriterionRepository.update(id, updateRiskCriterionDto);
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.riskCriterionRepository.delete(id);
    return { success: true };
  }
}
