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
    const saved = await this.auditUniverseRepository.save(universe);
    return this.recalculate(saved.id);
  }

  findAll() {
    return this.auditUniverseRepository.find({ order: { riskScore: 'DESC' } });
  }

  findOne(id: number) {
    return this.auditUniverseRepository.findOneBy({ id });
  }

  async update(id: number, updateAuditUniverseDto: UpdateAuditUniverseDto) {
    await this.auditUniverseRepository.update(id, updateAuditUniverseDto);
    return this.recalculate(id);
  }

  async remove(id: number) {
    await this.auditUniverseRepository.delete(id);
    return { success: true };
  }

  async recalculate(id: number): Promise<AuditUniverse | null> {
    const universe = await this.findOne(id);
    if (!universe) return null;

    // --- Tự động tính toán pastFindingsScore ---
    const findings = await this.auditFindingRepository.find({
      where: { businessProcessId: id },
    });

    let findingPoints = 0;
    for (const f of findings) {
      const level = f.riskLevel?.toLowerCase() || '';
      if (level === 'critical') findingPoints += 10;
      else if (level === 'high') findingPoints += 5;
      else if (level === 'medium') findingPoints += 2;
      else if (level === 'low') findingPoints += 1;
      else findingPoints += 1;
    }

    if (findingPoints === 0) universe.pastFindingsScore = 1.0;
    else if (findingPoints <= 5) universe.pastFindingsScore = 2.0;
    else if (findingPoints <= 10) universe.pastFindingsScore = 3.0;
    else if (findingPoints <= 20) universe.pastFindingsScore = 4.0;
    else universe.pastFindingsScore = 5.0;
    // -------------------------------------------

    let score = 0;
    const details = universe.scoreDetails || {};

    if (
      universe.layer === 1 ||
      universe.auditCategory === 'QuyTrinh' ||
      universe.auditCategory === 'HoiSo'
    ) {
      // Layer 1: Quy trình / Hội sở
      const residualRisk = details.residualRisk ?? 2.5;
      const size = details.size ?? 2.5;
      const findings = details.findings ?? 2.5;
      const changes = details.changes ?? 2.5;
      const regulatory = details.regulatory ?? 2.5;
      const auditGap = details.auditGap ?? 2.5;
      const boardInterest = details.boardInterest ?? 2.5;
      const fraud = details.fraud ?? 2.5;

      score =
        0.3 * residualRisk +
        0.15 * size +
        0.15 * findings +
        0.1 * changes +
        0.1 * regulatory +
        0.1 * auditGap +
        0.05 * boardInterest +
        0.05 * fraud;
    } else if (
      universe.auditCategory === 'ChiNhanh' ||
      universe.auditCategory === 'PGD'
    ) {
      // Layer 2: Đơn vị kinh doanh (Branches)
      // 50% max(Retail, Corp, Ops) + 30% avg(Retail, Corp, Ops) + 20% GenMgmt
      const retail = details.retail ?? 2.5;
      const corporate = details.corporate ?? 2.5;
      const ops = details.operations ?? 2.5;
      const genMgmt = details.generalManagement ?? 2.5;

      const maxScore = Math.max(retail, corporate, ops);
      const avgScore = (retail + corporate + ops) / 3;

      score = 0.5 * maxScore + 0.3 * avgScore + 0.2 * genMgmt;
    } else {
      // Fallback
      score =
        0.4 * (universe.pastFindingsScore ?? 2.5) +
        0.3 * (universe.financialSize ?? 2.5) +
        0.3 * (universe.operationalRiskScore ?? 2.5);
    }

    universe.riskScore = Math.round(score * 100) / 100;

    // Phân cấp rủi ro động theo thang điểm 1.0 - 5.0
    if (universe.riskScore >= 4.0) {
      universe.dynamicRiskRating = 'Rất cao';
    } else if (universe.riskScore >= 3.25) {
      universe.dynamicRiskRating = 'Cao';
    } else if (universe.riskScore >= 2.5) {
      universe.dynamicRiskRating = 'Trung bình';
    } else {
      universe.dynamicRiskRating = 'Thấp';
    }

    // Tính năm khuyến nghị kiểm toán tiếp theo dựa trên ngày kiểm toán cuối cùng và cấp rủi ro
    const currentYear = new Date().getFullYear();
    const startYear = universe.lastAuditDate
      ? new Date(universe.lastAuditDate).getFullYear()
      : currentYear - 1;

    if (universe.dynamicRiskRating === 'Rất cao') {
      universe.nextAuditYear = startYear + 1; // Rủi ro rất cao: 12 tháng
    } else if (universe.dynamicRiskRating === 'Cao') {
      universe.nextAuditYear = startYear + 2; // Rủi ro cao: 24 tháng
    } else if (universe.dynamicRiskRating === 'Trung bình') {
      universe.nextAuditYear = startYear + 3; // Rủi ro trung bình: 36 tháng
    } else {
      universe.nextAuditYear = startYear + 5; // Rủi ro thấp: 60 tháng
    }

    // Đảm bảo năm kiểm toán tiếp theo không nằm trong quá khứ
    if (universe.nextAuditYear < currentYear) {
      universe.nextAuditYear = currentYear;
    }

    return this.auditUniverseRepository.save(universe);
  }

  async recalculateAll(): Promise<AuditUniverse[]> {
    const list = await this.auditUniverseRepository.find();
    const updated: any[] = [];
    for (const item of list) {
      const res = await this.recalculate(item.id);
      if (res) updated.push(res);
    }
    return updated;
  }

  // ═══════════════════════ KẾ THỪA & CHUYỂN GIAO RỦI RO (IIA STANDARD 2010) ═══════════════════════

  /**
   * Kế thừa rủi ro & lịch sử sai phạm từ ĐVKD cũ sang ĐVKD mới (Nâng cấp PGD -> CN, sáp nhập)
   */
  async transferRisk(
    sourceUniverseId: number,
    targetUniverseId: number,
    notes?: string,
  ): Promise<{
    source: AuditUniverse;
    target: AuditUniverse;
    updatedFindingsCount: number;
  }> {
    const source = await this.findOne(sourceUniverseId);
    const target = await this.findOne(targetUniverseId);

    if (!source || !target) {
      throw new Error('Không tìm thấy đối tượng kiểm toán nguồn hoặc đích.');
    }

    // 1. Chuyển giao điểm rủi ro kế thừa
    target.transferredFromUniverseId = source.id;
    target.transferredFromDeptCode = source.departmentCode || source.department;
    target.transferredRiskScore = source.riskScore || 2.5;
    target.transferNotes =
      notes ||
      `Kế thừa rủi ro từ đơn vị cũ: ${source.name} (${source.departmentCode || ''})`;

    // Kế thừa điểm sai phạm quá khứ nếu đơn vị mới chưa có dữ liệu
    target.pastFindingsScore = Math.max(
      target.pastFindingsScore || 1.0,
      source.pastFindingsScore || 1.0,
    );
    target.operationalRiskScore = Math.max(
      target.operationalRiskScore || 2.5,
      source.operationalRiskScore || 2.5,
    );

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
    await this.recalculate(target.id);

    return {
      source,
      target: (await this.findOne(savedTarget.id))!,
      updatedFindingsCount: updatedCount,
    };
  }
}
