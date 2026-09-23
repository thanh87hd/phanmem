import { Injectable } from '@nestjs/common';
import { CreateAuditUniverseDto } from './dto/create-audit-universe.dto';
import { UpdateAuditUniverseDto } from './dto/update-audit-universe.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditUniverse } from './entities/audit-universe.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';

@Injectable()
export class AuditUniverseService {
  constructor(
    @InjectRepository(AuditUniverse)
    private readonly auditUniverseRepository: Repository<AuditUniverse>,
    @InjectRepository(AuditFinding)
    private readonly auditFindingRepository: Repository<AuditFinding>,
  ) {}

  async create(createAuditUniverseDto: CreateAuditUniverseDto) {
    const universe = this.auditUniverseRepository.create(
      createAuditUniverseDto,
    );
    return await this.auditUniverseRepository.save(universe);
  }

  async findAll() {
    const universes = await this.auditUniverseRepository.find({
      order: { name: 'ASC' },
    });

    // Projection latest risk assessment for each universe
    let assessments: any[] = [];
    try {
      assessments = await this.auditUniverseRepository.manager.query(`
        SELECT DISTINCT ON ("auditUniverseId")
          id, "auditUniverseId", "residualRiskScore", "totalScore", "riskLevel", status, "assessmentYear"
        FROM risk_assessments
        ORDER BY "auditUniverseId", "assessmentYear" DESC, version DESC, id DESC
      `);
    } catch {
      // Fallback if table doesn't have columns yet
      assessments = [];
    }

    const assessmentMap = new Map<number, any>();
    for (const a of assessments) {
      if (a.auditUniverseId && !assessmentMap.has(a.auditUniverseId)) {
        assessmentMap.set(a.auditUniverseId, a);
      }
    }

    return universes.map((u) => {
      const matched = assessmentMap.get(u.id);
      return {
        ...u,
        riskScore: matched ? matched.residualRiskScore ?? matched.totalScore : null,
        dynamicRiskRating: matched ? matched.riskLevel : null,
        riskAssessmentStatus: matched ? matched.status : null,
        latestAssessmentYear: matched ? matched.assessmentYear : null,
        latestAssessmentId: matched ? matched.id : null,
      };
    });
  }

  async findOne(id: number) {
    const universe = await this.auditUniverseRepository.findOneBy({ id });
    if (!universe) return null;

    let matched: any = null;
    try {
      const results = await this.auditUniverseRepository.manager.query(
        `SELECT id, "residualRiskScore", "totalScore", "riskLevel", status, "assessmentYear"
         FROM risk_assessments
         WHERE "auditUniverseId" = $1
         ORDER BY "assessmentYear" DESC, version DESC, id DESC
         LIMIT 1`,
        [id],
      );
      if (results && results.length > 0) matched = results[0];
    } catch {
      matched = null;
    }

    return {
      ...universe,
      riskScore: matched ? matched.residualRiskScore ?? matched.totalScore : null,
      dynamicRiskRating: matched ? matched.riskLevel : null,
      riskAssessmentStatus: matched ? matched.status : null,
      latestAssessmentYear: matched ? matched.assessmentYear : null,
      latestAssessmentId: matched ? matched.id : null,
    };
  }

  async update(id: number, updateAuditUniverseDto: UpdateAuditUniverseDto) {
    await this.auditUniverseRepository.update(id, updateAuditUniverseDto);
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.auditUniverseRepository.delete(id);
    return { success: true };
  }

  async recalculate(id: number): Promise<any> {
    return this.findOne(id);
  }

  async recalculateAll(): Promise<any[]> {
    return this.findAll();
  }

  // ═══════════════════════ KẾ THỪA & CHUYỂN GIAO ĐƠN VỊ (IIA STANDARD 2010) ═══════════════════════

  /**
   * Kế thừa lịch sử sai phạm từ ĐVKD cũ sang ĐVKD mới (Nâng cấp PGD -> CN, sáp nhập)
   */
  async transferRisk(
    sourceUniverseId: number,
    targetUniverseId: number,
    notes?: string,
  ): Promise<{
    source: any;
    target: any;
    updatedFindingsCount: number;
  }> {
    const source = await this.findOne(sourceUniverseId);
    const target = await this.auditUniverseRepository.findOneBy({ id: targetUniverseId });

    if (!source || !target) {
      throw new Error('Không tìm thấy đối tượng kiểm toán nguồn hoặc đích.');
    }

    // 1. Chuyển giao thông tin kế thừa
    target.transferredFromUniverseId = source.id;
    target.transferredFromDeptCode = source.departmentCode || source.department;
    target.transferNotes =
      notes ||
      `Kế thừa từ đơn vị cũ: ${source.name} (${source.departmentCode || ''})`;

    // 2. Chuyển giao các phát hiện chưa đóng từ thực thể cũ sang thực thể mới
    const findings = await this.auditFindingRepository.find({
      where: { businessProcessId: source.id },
    });

    let updatedCount = 0;
    for (const f of findings) {
      if (f.status !== 'Closed' && f.status !== 'Resolved') {
        await this.auditFindingRepository.update(f.id, {
          businessProcessId: target.id,
          legacyBusinessProcess: target.name,
        });
        updatedCount++;
      }
    }

    const savedTarget = await this.auditUniverseRepository.save(target);

    return {
      source,
      target: (await this.findOne(savedTarget.id))!,
      updatedFindingsCount: updatedCount,
    };
  }
}
