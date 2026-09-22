import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditMinute } from './entities/audit-minute.entity';
import { AuditFinding } from './entities/audit-finding.entity';
import { AuditSample } from './entities/audit-sample.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';
import { WorkingPaper } from '../working-papers/entities/working-paper.entity';
import { AuditMinutesExportService } from './audit-minutes-export.service';

@Injectable()
export class AuditMinutesService {
  constructor(
    @InjectRepository(AuditMinute)
    private readonly auditMinuteRepository: Repository<AuditMinute>,
    @InjectRepository(AuditFinding)
    private readonly findingRepo: Repository<AuditFinding>,
    @InjectRepository(AuditSample)
    private readonly sampleRepo: Repository<AuditSample>,
    @InjectRepository(AuditEngagement)
    private readonly engagementRepo: Repository<AuditEngagement>,
    @InjectRepository(WorkingPaper)
    private readonly wpRepo: Repository<WorkingPaper>,
    private readonly exportService: AuditMinutesExportService,
  ) {}

  async create(createDto: any): Promise<AuditMinute> {
    const minute = this.auditMinuteRepository.create({ ...createDto });
    return this.auditMinuteRepository.save(minute as any);
  }

  async findAllByEngagement(engagementId: number): Promise<AuditMinute[]> {
    return this.auditMinuteRepository.find({
      where: { engagementId },
      relations: ['findings'],
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number): Promise<AuditMinute> {
    const minute = await this.auditMinuteRepository.findOne({
      where: { id },
      relations: ['findings', 'findings.personnel', 'engagement'],
    });
    if (!minute) {
      throw new NotFoundException(`AuditMinute #${id} not found`);
    }
    return minute;
  }

  async update(id: number, updateDto: any, user?: any): Promise<AuditMinute> {
    const minute = await this.findOne(id);

    // Nếu có sự thay đổi từ Trưởng đoàn khi review thì tăng bộ đếm leadReviewCount và ghi lịch sử
    if (updateDto.isLeadReview) {
      minute.leadReviewCount = (minute.leadReviewCount || 0) + 1;
      const historyEntry = {
        reviewerId: user?.userId || 0,
        reviewerName: user?.fullName || user?.username || 'Trưởng đoàn',
        role: 'Trưởng đoàn kiểm toán',
        reviewedAt: new Date().toISOString(),
        action: updateDto.reviewAction || 'Chỉnh sửa / Soát xét Biên bản',
        comments: updateDto.reviewComments || '',
      };
      minute.reviewHistory = [...(minute.reviewHistory || []), historyEntry];
      delete updateDto.isLeadReview;
      delete updateDto.reviewAction;
      delete updateDto.reviewComments;
    }

    Object.assign(minute, updateDto);
    return this.auditMinuteRepository.save(minute);
  }

  async remove(id: number): Promise<void> {
    const minute = await this.findOne(id);
    await this.auditMinuteRepository.remove(minute);
  }

  /**
   * Tự động tổng hợp thông tin Đoàn kiểm toán, các WP đã duyệt của từng KTV và phát hiện vào Biên bản kiểm toán
   */
  async collateFromWorkingPapers(
    engagementId: number,
    user?: any,
  ): Promise<AuditMinute> {
    const engagement = await this.engagementRepo.findOne({
      where: { id: engagementId },
      relations: ['leadAuditorUser', 'auditedDepartment', 'plan'],
    });
    if (!engagement) {
      throw new NotFoundException(
        `Cuộc kiểm toán #${engagementId} không tồn tại`,
      );
    }

    // 1. Tìm tất cả Working Papers của đoàn
    const workingPapers = await this.wpRepo.find({
      where: { engagementId },
      relations: ['creatorUser'],
      order: { id: 'ASC' },
    });

    // 2. Tìm hoặc tạo AuditMinute
    let minute = await this.auditMinuteRepository.findOne({
      where: { engagementId },
      relations: ['findings', 'findings.personnel'],
    });

    const leadAuditorName =
      engagement.legacyLeadAuditor ||
      engagement.leadAuditorUser?.fullName ||
      'Trưởng đoàn';
    const auditedUnitName =
      engagement.branchName ||
      engagement.legacyAuditedDepartment ||
      engagement.name;
    const decisionNumber = engagement.decisionNo || `QĐ-KTNB-${engagement.id}`;
    const fieldworkPeriod =
      engagement.fieldworkStartDate && engagement.fieldworkEndDate
        ? `Từ ngày ${engagement.fieldworkStartDate} đến ngày ${engagement.fieldworkEndDate}`
        : 'Theo kế hoạch đã phê duyệt';

    // Format danh sách thành viên đoàn cùng nghiệp vụ
    let membersList = `1. Ông/Bà: ${leadAuditorName} - Chức danh: Trưởng đoàn\n`;
    if (engagement.teamMembers && Array.isArray(engagement.teamMembers)) {
      engagement.teamMembers.forEach((m, idx) => {
        if (m.fullName && m.fullName !== leadAuditorName) {
          membersList += `${idx + 2}. Ông/Bà: ${m.fullName} - Chức danh/Vai trò: ${m.role || 'Thành viên đoàn'}\n`;
        }
      });
    }

    if (!minute) {
      minute = this.auditMinuteRepository.create({
        engagementId,
        minuteNo: decisionNumber
          ? `BBKT-${decisionNumber}`
          : `BBKT-${engagement.id}-${new Date().getFullYear()}`,
        title: `Biên bản kiểm toán tại ${auditedUnitName}`,
        issueDate:
          engagement.fieldworkEndDate || new Date().toISOString().split('T')[0],
        status: 'Draft',
        auditedUnitName,
        leadAuditorName,
        teamMembersText: membersList,
        fieldworkPeriod,
        decisionNumber,
      });
      minute = await this.auditMinuteRepository.save(minute);
    } else {
      minute.auditedUnitName = auditedUnitName;
      minute.leadAuditorName = leadAuditorName;
      minute.teamMembersText = membersList;
      minute.fieldworkPeriod = fieldworkPeriod;
      minute.decisionNumber = decisionNumber;
      minute = await this.auditMinuteRepository.save(minute);
    }

    // 3. Quét tất cả Findings thuộc cuộc kiểm toán và gán minuteId
    const findings = await this.findingRepo.find({
      where: { engagementId },
      relations: ['personnel'],
    });

    for (const f of findings) {
      if (f.minuteId !== minute.id) {
        await this.findingRepo.update(f.id, { minuteId: minute.id });
      }
    }

    // 4. Thống kê số lượng phát hiện để ghi vào summaryContent
    const tdCount = findings.filter((f) => f.operationType === 'TD').length;
    const ptdCount = findings.filter(
      (f) => f.operationType === 'PTD' || f.operationType !== 'TD',
    ).length;
    const highRiskCount = findings.filter(
      (f) => f.riskLevel === 'High' || f.riskLevel === 'Cao',
    ).length;
    const medRiskCount = findings.filter(
      (f) => f.riskLevel === 'Medium' || f.riskLevel === 'Trung bình',
    ).length;
    const lowRiskCount = findings.filter(
      (f) => f.riskLevel === 'Low' || f.riskLevel === 'Thấp',
    ).length;

    minute.summaryContent = `Tổng số phát hiện ghi nhận: ${findings.length} (Tín dụng: ${tdCount}, Phi tín dụng: ${ptdCount}). Phân loại rủi ro: Cao (${highRiskCount}), Trung bình (${medRiskCount}), Thấp (${lowRiskCount}). Đã tổng hợp từ ${workingPapers.length} Giấy tờ làm việc của các KTV trong đoàn.`;
    await this.auditMinuteRepository.save(minute);

    return this.findOne(minute.id);
  }

  /**
   * Sinh Biên bản kiểm toán MB04 (Word) — Ủy quyền cho AuditMinutesExportService
   */
  async generateWord(id: number, exportType?: string): Promise<Buffer> {
    return this.exportService.generateWord(id, exportType);
  }

  /**
   * Sinh file Excel đối soát — Ủy quyền cho AuditMinutesExportService
   */
  async generateExcel(id: number, exportType?: string): Promise<Buffer> {
    return this.exportService.generateExcel(id, exportType);
  }
}
