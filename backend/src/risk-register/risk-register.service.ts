import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiskRegister } from './entities/risk-register.entity';
import { CreateRiskRegisterDto } from './dto/create-risk-register.dto';
import { UpdateRiskRegisterDto } from './dto/update-risk-register.dto';

@Injectable()
export class RiskRegisterService {
  private readonly logger = new Logger(RiskRegisterService.name);

  constructor(
    @InjectRepository(RiskRegister)
    private readonly riskRepo: Repository<RiskRegister>,
  ) {}

  /**
   * Tính toán rủi ro tự động theo THUCTE Framework
   */
  private computeScores(data: Partial<RiskRegister>): Partial<RiskRegister> {
    const res = { ...data };

    // Inherent risk = sqrt(Impact * Likelihood) or Impact * Likelihood / 5
    if (res.impactScore && res.likelihoodScore) {
      res.inherentRiskScore =
        Math.round(Math.sqrt(res.impactScore * res.likelihoodScore) * 100) /
        100;
      if (res.inherentRiskScore >= 3.8) res.inherentRiskLevel = 'Rất cao';
      else if (res.inherentRiskScore >= 3.0) res.inherentRiskLevel = 'Cao';
      else if (res.inherentRiskScore >= 2.0)
        res.inherentRiskLevel = 'Trung bình';
      else res.inherentRiskLevel = 'Thấp';
    }

    // Control rating từ Design & Operating effectiveness (CE = 0.4*DE + 0.6*OE)
    if (
      res.designEffectiveness !== undefined &&
      res.operatingEffectiveness !== undefined
    ) {
      const ce =
        0.4 * res.designEffectiveness + 0.6 * res.operatingEffectiveness;
      if (ce >= 0.75) res.controlRating = 'Tốt';
      else if (ce >= 0.4) res.controlRating = 'Trung bình';
      else res.controlRating = 'Yếu';

      // Residual = Inherent * (1 - CE)
      if (res.inherentRiskScore) {
        res.residualRiskScore =
          Math.round(res.inherentRiskScore * (1 - ce) * 100) / 100;
        if (res.residualRiskScore >= 3.8) res.finalRiskBand = 'Đỏ';
        else if (res.residualRiskScore >= 3.0) res.finalRiskBand = 'Cam';
        else if (res.residualRiskScore >= 2.0) res.finalRiskBand = 'Vàng';
        else res.finalRiskBand = 'Xanh';
      }
    }

    return res;
  }

  async create(
    createDto: CreateRiskRegisterDto,
    user?: any,
  ): Promise<RiskRegister> {
    const computed = this.computeScores(createDto as any);
    const item = this.riskRepo.create({
      ...computed,
      riskOwnerId: computed.riskOwnerId || user?.id,
      riskOwnerName: computed.riskOwnerName || user?.name || user?.username,
    });
    return this.riskRepo.save(item);
  }

  async findAll(query: {
    auditObjectId?: number;
    domain?: string;
    riskCategory?: string;
    finalRiskBand?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const qb = this.riskRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.auditObject', 'auditObject')
      .leftJoinAndSelect('r.riskOwner', 'riskOwner');

    if (query.auditObjectId) {
      qb.andWhere('r.auditObjectId = :auditObjectId', {
        auditObjectId: query.auditObjectId,
      });
    }

    if (query.domain) {
      qb.andWhere('r.domain = :domain', { domain: query.domain });
    }

    if (query.riskCategory) {
      qb.andWhere('r.riskCategory = :riskCategory', {
        riskCategory: query.riskCategory,
      });
    }

    if (query.finalRiskBand) {
      qb.andWhere('r.finalRiskBand = :finalRiskBand', {
        finalRiskBand: query.finalRiskBand,
      });
    }

    if (query.search) {
      qb.andWhere(
        '(r.riskTitle ILIKE :search OR r.riskDescription ILIKE :search OR r.hsrrCode ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('r.domain', 'ASC')
      .addOrderBy('r.sequenceNo', 'ASC')
      .addOrderBy('r.id', 'ASC');

    if (query.page && query.limit) {
      const page = Math.max(1, query.page);
      const limit = Math.max(1, query.limit);
      qb.skip((page - 1) * limit).take(limit);
      const [items, total] = await qb.getManyAndCount();
      return { items, total, page, limit };
    }

    const items = await qb.getMany();
    return { items, total: items.length };
  }

  async findOne(id: number): Promise<RiskRegister> {
    const item = await this.riskRepo.findOne({
      where: { id },
      relations: ['auditObject', 'riskOwner'],
    });
    if (!item) {
      throw new NotFoundException(`Risk Register item with ID ${id} not found`);
    }
    return item;
  }

  async update(
    id: number,
    updateDto: UpdateRiskRegisterDto,
  ): Promise<RiskRegister> {
    const item = await this.findOne(id);
    const computed = this.computeScores({ ...item, ...updateDto } as any);
    Object.assign(item, computed);
    return this.riskRepo.save(item);
  }

  async remove(id: number): Promise<{ success: boolean }> {
    const item = await this.findOne(id);
    await this.riskRepo.remove(item);
    return { success: true };
  }

  async getSummary(assessmentYear?: number) {
    const qb = this.riskRepo.createQueryBuilder('r');
    if (assessmentYear) {
      qb.where('r.assessmentYear = :year', { year: assessmentYear });
    }

    const all = await qb.getMany();

    const byDomain: Record<string, number> = {};
    const byRiskBand: Record<string, number> = {
      Đỏ: 0,
      Cam: 0,
      Vàng: 0,
      Xanh: 0,
      'Chưa xác định': 0,
    };
    const byControlRating: Record<string, number> = {
      Tốt: 0,
      'Trung bình': 0,
      Yếu: 0,
      'Chưa xác định': 0,
    };

    let totalInherent = 0;
    let totalResidual = 0;
    let scoredCount = 0;

    all.forEach((item) => {
      // By Domain
      const dom = item.domain || 'Chưa phân loại';
      byDomain[dom] = (byDomain[dom] || 0) + 1;

      // By Risk Band
      const band = item.finalRiskBand || 'Chưa xác định';
      byRiskBand[band] = (byRiskBand[band] || 0) + 1;

      // By Control Rating
      const cr = item.controlRating || 'Chưa xác định';
      byControlRating[cr] = (byControlRating[cr] || 0) + 1;

      if (item.inherentRiskScore) {
        totalInherent += Number(item.inherentRiskScore);
        if (item.residualRiskScore) {
          totalResidual += Number(item.residualRiskScore);
        }
        scoredCount++;
      }
    });

    return {
      total: all.length,
      byDomain,
      byRiskBand,
      byControlRating,
      avgInherent:
        scoredCount > 0
          ? Math.round((totalInherent / scoredCount) * 100) / 100
          : 0,
      avgResidual:
        scoredCount > 0
          ? Math.round((totalResidual / scoredCount) * 100) / 100
          : 0,
    };
  }

  async bulkImport(items: Partial<RiskRegister>[], user?: any) {
    this.logger.log(`Starting bulk import of ${items.length} risk items...`);
    const entities = items.map((item) => {
      const computed = this.computeScores(item);
      return this.riskRepo.create({
        ...computed,
        riskOwnerId: computed.riskOwnerId || user?.id,
        riskOwnerName: computed.riskOwnerName || user?.name || user?.username,
      });
    });

    // Save in batches of 100
    const batchSize = 100;
    const saved: RiskRegister[] = [];
    for (let i = 0; i < entities.length; i += batchSize) {
      const chunk = entities.slice(i, i + batchSize);
      const res = await this.riskRepo.save(chunk);
      saved.push(...res);
    }

    this.logger.log(
      `Successfully imported ${saved.length} risk register items.`,
    );
    return { success: true, count: saved.length };
  }
}
