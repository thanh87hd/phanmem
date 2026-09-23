import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { RcsaAssessment } from './entities/rcsa-assessment.entity';
import { AuditUniverse } from '../audit-universe/entities/audit-universe.entity';
import { KriAlert } from '../risk-indicators/entities/kri-alert.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';

@Injectable()
export class RcsaService {
  private readonly logger = new Logger(RcsaService.name);

  constructor(
    @InjectRepository(RcsaAssessment)
    private readonly rcsaRepository: Repository<RcsaAssessment>,
    private readonly entityManager: EntityManager,
  ) {}

  async createRcsa(dto: any) {
    const rcsa = this.rcsaRepository.create(dto);
    return this.rcsaRepository.save(rcsa);
  }

  async findAllRcsa() {
    return this.rcsaRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findRcsaByDepartment(departmentName: string) {
    return this.rcsaRepository.find({
      where: { departmentName },
      order: { createdAt: 'DESC' },
    });
  }

  async calculateDynamicRerating() {
    const universes = await this.entityManager
      .getRepository(AuditUniverse)
      .find();
    const rcsas = await this.rcsaRepository.find();
    const kris = await this.entityManager
      .getRepository(KriAlert)
      .find({ where: { status: 'Active' } });
    const recommendations = await this.entityManager
      .getRepository(Recommendation)
      .find();

    const results: any[] = [];

    for (const universe of universes) {
      const deptRcsas = rcsas.filter(
        (r) =>
          r.departmentName === universe.department ||
          r.departmentName === universe.name,
      );
      let rcsaPart = 5.0;
      if (deptRcsas.length > 0) {
        const sumResidual = deptRcsas.reduce(
          (sum, r) => sum + (r.residualRisk || 3),
          0,
        );
        rcsaPart = (sumResidual / deptRcsas.length) * 2.0;
      }

      const deptKris = kris.filter(
        (k) =>
          k.departmentName === universe.department ||
          k.departmentName === universe.name ||
          (k.departmentCode && k.departmentCode === universe.departmentCode),
      );
      let kriPart = 0.0;
      for (const k of deptKris) {
        if (k.severity === 'Critical') kriPart += 3.0;
        else if (k.severity === 'High') kriPart += 2.0;
        else kriPart += 1.0;
      }
      if (kriPart > 10.0) kriPart = 10.0;

      const deptFindings = recommendations.filter(
        (rec) =>
          (rec.legacyDepartment === universe.department ||
            rec.legacyDepartment === universe.name) &&
          rec.status !== 'Completed' &&
          rec.status !== 'Verified',
      );
      let findingsPart = deptFindings.length * 1.5;
      if (findingsPart > 10.0) findingsPart = 10.0;

      const dynamicRiskScore = parseFloat(
        (rcsaPart + kriPart + findingsPart).toFixed(2),
      );

      let dynamicRiskRating = 'Low';
      if (dynamicRiskScore >= 22.0) dynamicRiskRating = 'Critical';
      else if (dynamicRiskScore >= 15.0) dynamicRiskRating = 'High';
      else if (dynamicRiskScore >= 8.0) dynamicRiskRating = 'Medium';

      const currentYear = new Date().getFullYear();
      if (dynamicRiskRating === 'Critical') {
        universe.nextAuditYear = currentYear;
      } else if (dynamicRiskRating === 'High') {
        universe.nextAuditYear = Math.min(
          universe.nextAuditYear || currentYear + 1,
          currentYear + 1,
        );
      }
      await this.entityManager.getRepository(AuditUniverse).save(universe);

      results.push({
        id: universe.id,
        name: universe.name,
        legacyDepartmentName: universe.department,
        riskScore: parseFloat((dynamicRiskScore / 3.0).toFixed(2)),
        dynamicRiskRating,
        rcsaPart: parseFloat(rcsaPart.toFixed(2)),
        rcsaCount: deptRcsas.length,
        kriPart: parseFloat(kriPart.toFixed(2)),
        kriCount: deptKris.length,
        findingsPart: parseFloat(findingsPart.toFixed(2)),
        findingsCount: deptFindings.length,
        dynamicRiskScore,
        nextAuditYear: universe.nextAuditYear,
      });
    }

    return results;
  }
}
