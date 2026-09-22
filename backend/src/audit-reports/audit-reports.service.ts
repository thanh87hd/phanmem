import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateAuditReportDto } from './dto/create-audit-report.dto';
import { UpdateAuditReportDto } from './dto/update-audit-report.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditReport } from './entities/audit-report.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import { ScopeFilterService } from '../utils/scope-filter.service';
import { AuditSample } from '../audit-findings/entities/audit-sample.entity';
import { AuditReportsExportService } from './audit-reports-export.service';
import { ReportDistribution } from './entities/report-distribution.entity';

@Injectable()
export class AuditReportsService {
  constructor(
    @InjectRepository(AuditReport)
    private readonly auditReportRepository: Repository<AuditReport>,
    @InjectRepository(AuditFinding)
    private readonly findingRepo: Repository<AuditFinding>,
    @InjectRepository(Recommendation)
    private readonly recRepo: Repository<Recommendation>,
    @InjectRepository(AuditSample)
    private readonly sampleRepo: Repository<AuditSample>,
    @InjectRepository(ReportDistribution)
    private readonly distRepo: Repository<ReportDistribution>,
    private readonly exportService: AuditReportsExportService,
  ) {}

  create(dto: CreateAuditReportDto) {
    const payload: any = { ...dto };
    if (payload.teamMembers && typeof payload.teamMembers !== 'string') {
      payload.teamMembers = JSON.stringify(payload.teamMembers);
    }
    const report = this.auditReportRepository.create(payload);
    return this.auditReportRepository.save(report);
  }

  async findAll(user?: any) {
    const query = this.auditReportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.engagement', 'engagement')
      .orderBy('report.createdAt', 'DESC');

    const isAdmin = ScopeFilterService.isAdminRole(user?.role);

    if (user && !isAdmin) {
      query.andWhere(
        '(engagement.leadAuditorId = :userId OR engagement.teamMembers LIKE :likeUserId)',
        { userId: user.userId, likeUserId: `%"userId":${user.userId}%` },
      );
    }
    return query.getMany();
  }

  findOne(id: number) {
    return this.auditReportRepository.findOne({
      where: { id },
      relations: [
        'engagement',
        'engagement.leadAuditorUser',
        'engagement.auditedDepartment',
        'engagement.plan',
      ],
    });
  }

  async update(id: number, dto: UpdateAuditReportDto) {
    await this.auditReportRepository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.auditReportRepository.delete(id);
    return { success: true };
  }

  /** Workflow: Draft → PendingReview → Reviewed → Issued */
  async changeStatus(
    id: number,
    newStatus: string,
    userId?: number,
    username?: string,
  ) {
    const report = await this.findOne(id);
    if (!report) throw new NotFoundException('Báo cáo không tồn tại');

    const validTransitions: Record<string, string[]> = {
      Draft: ['PendingReview'],
      PendingReview: ['Reviewed', 'Draft'],
      Reviewed: ['Issued', 'PendingReview'],
      Issued: ['Archived'],
    };

    const allowed = validTransitions[report.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Không thể chuyển từ "${report.status}" sang "${newStatus}". Chỉ cho phép: ${allowed.join(', ')}`,
      );
    }

    const updateData: Partial<AuditReport> = { status: newStatus };
    if (newStatus === 'Issued') {
      updateData.date = new Date().toISOString().split('T')[0];
      updateData.issuedBy = username || 'System';
    }

    // Nếu Lãnh đạo Phòng review / yêu cầu chỉnh sửa (từ PendingReview về Draft hoặc Reviewed)
    if (report.status === 'PendingReview') {
      report.managerReviewCount = (report.managerReviewCount || 0) + 1;
      const historyEntry = {
        reviewerId: userId || 0,
        reviewerName: username || 'Lãnh đạo Phòng',
        role: 'Lãnh đạo Phòng / Khối KTNB',
        reviewedAt: new Date().toISOString(),
        fromStatus: report.status,
        toStatus: newStatus,
        reviewNotes:
          newStatus === 'Draft'
            ? 'Yêu cầu đoàn chỉnh sửa lại Báo cáo'
            : 'Đã duyệt đạt yêu cầu',
      };
      report.reviewHistory = [...(report.reviewHistory || []), historyEntry];
      updateData.managerReviewCount = report.managerReviewCount;
      updateData.reviewHistory = report.reviewHistory;
    }

    await this.auditReportRepository.update(id, updateData);
    return this.findOne(id);
  }

  /** Cập nhật trạng thái background export job */
  async updateExportStatus(
    id: number,
    status: string,
    jobId: string,
    fileUrl?: string,
  ) {
    const updateData: Partial<AuditReport> = {
      exportStatus: status,
      exportJobId: jobId,
    };
    if (fileUrl) updateData.exportFileUrl = fileUrl;
    await this.auditReportRepository.update(id, updateData);
  }

  /** Cập nhật trạng thái background sign job */
  async updateSignStatus(id: number, status: string, jobId: string) {
    await this.auditReportRepository.update(id, {
      signStatus: status,
      signJobId: jobId,
    });
  }

  /** Chữ ký số (Mock Digital Signature - Xử lý ngầm) */
  async processDigitalSignature(id: number, username: string) {
    const report = await this.findOne(id);
    if (!report) throw new NotFoundException('Báo cáo không tồn tại');
    if (report.status !== 'Issued') {
      throw new BadRequestException(
        'Chỉ có thể ký số báo cáo đã phát hành (Issued)',
      );
    }
    if (report.isSigned) {
      throw new BadRequestException('Báo cáo đã được ký số trước đó');
    }

    // Giả lập độ trễ khi gọi API Ký số của bên thứ 3 (e.g., VNPT CA, Viettel CA)
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Mock Hash / Digital Signature Data
    const signatureData = `DIGITAL_SIGNATURE_${id}_${Date.now()}_${Buffer.from(report.title).toString('base64').substring(0, 20)}`;

    await this.auditReportRepository.update(id, {
      isSigned: true,
      signature: signatureData as any,
      signedAt: new Date(),
    });

    return this.findOne(id);
  }

  /** Auto-generate report from engagement findings (Pseudo-AI Smart Generation) */
  async autoGenerate(engagementId: number, title: string, plan?: string) {
    const findings = await this.findingRepo.find({
      where: { engagementId },
      order: { riskLevel: 'ASC' },
    });

    const recs = await this.recRepo.find();
    const relatedRecs = recs.filter((r) =>
      findings.some((f) => f.findingTitle === r.finding),
    );

    const critical = findings.filter((f) => f.riskLevel === 'Critical').length;
    const high = findings.filter((f) => f.riskLevel === 'High').length;
    const medium = findings.filter((f) => f.riskLevel === 'Medium').length;
    const low = findings.filter((f) => f.riskLevel === 'Low').length;

    // Smart Text Generation
    let executiveSummary = `Đoàn kiểm toán đã hoàn tất việc rà soát và đánh giá các quy trình/hoạt động thuộc phạm vi kiểm toán. Tổng số có ${findings.length} phát hiện rủi ro và ${relatedRecs.length} kiến nghị được đưa ra.\n\n`;

    if (critical > 0 || high > 0) {
      executiveSummary += `Đáng chú ý, hệ thống ghi nhận có ${critical} lỗi mức độ Nghiêm trọng và ${high} lỗi mức độ Cao. Các rủi ro này chủ yếu liên quan đến việc không tuân thủ quy trình, có nguy cơ gây thất thoát tài sản hoặc ảnh hưởng tiêu cực đến uy tín của Ngân hàng. Cần có biện pháp khắc phục ngay lập tức.\n`;
    } else if (medium > 0) {
      executiveSummary += `Phần lớn các phát hiện nằm ở mức độ rủi ro Trung bình (${medium} lỗi). Các hoạt động cơ bản vẫn đang được kiểm soát, nhưng vẫn tồn tại những lỗ hổng trong quy trình tác nghiệp cần được củng cố để ngăn ngừa rủi ro tiềm ẩn.\n`;
    } else {
      executiveSummary += `Các phát hiện chủ yếu mang tính chất hoàn thiện hệ thống ở mức độ Thấp (${low} lỗi). Đơn vị đang duy trì hệ thống kiểm soát nội bộ khá hiệu quả.\n`;
    }

    // Auto calculate rating
    let rating = 'Hạng 2';
    let conclusion = '';

    if (critical > 0) {
      rating = 'Hạng 5';
      conclusion =
        'Dựa trên kết quả kiểm tra, Đoàn kiểm toán đánh giá mức độ rủi ro tổng thể của đơn vị ở Mức Rất Cao (Hạng 5). Hệ thống kiểm soát nội bộ hiện tại không đủ khả năng nhận diện và ngăn chặn rủi ro. Đề nghị Ban điều hành có biện pháp can thiệp ngay lập tức.';
    } else if (high >= 3) {
      rating = 'Hạng 4';
      conclusion =
        'Đoàn kiểm toán đánh giá mức độ rủi ro ở Mức Cao (Hạng 4). Đơn vị cần rà soát lại toàn diện quy trình kiểm soát và khẩn trương thực hiện các kiến nghị để đưa rủi ro về mức chấp nhận được.';
    } else if (high > 0 || medium > 3) {
      rating = 'Hạng 3';
      conclusion =
        'Hệ thống kiểm soát nội bộ của đơn vị đạt mức Trung bình (Hạng 3). Cần chú trọng nâng cao năng lực giám sát và khắc phục triệt để các rủi ro đã được chỉ ra.';
    } else if (medium > 0) {
      rating = 'Hạng 2';
      conclusion =
        'Đoàn kiểm toán đánh giá đơn vị hoạt động khá tốt (Hạng 2). Hệ thống kiểm soát nội bộ cơ bản đáp ứng yêu cầu, tuy nhiên vẫn cần cải thiện một số điểm nhỏ.';
    } else {
      rating = 'Hạng 1';
      conclusion =
        'Đơn vị thực hiện rất tốt các quy định (Hạng 1). Hệ thống kiểm soát nội bộ vững mạnh, không có rủi ro đáng kể nào được phát hiện.';
    }

    const report = this.auditReportRepository.create({
      title,
      plan: plan || '',
      engagementId,
      executiveSummary,
      overallConclusion: conclusion,
      auditRating: rating,
      conformanceStatement:
        'Cuộc kiểm toán này được thực hiện tuân thủ đầy đủ theo Bộ Chuẩn mực Thực hành Chuyên môn Quốc tế về Kiểm toán Nội bộ (IIA Global Internal Audit Standards 2024) và Thông tư 13/2018/TT-NHNN.',
      hasNonConformance: false,
      status: 'Draft',
    });

    return this.auditReportRepository.save(report);
  }

  async generateWord(id: number, templateType?: string): Promise<Buffer> {
    const report = await this.findOne(id);
    if (!report) throw new NotFoundException('Report not found');
    return this.exportService.generateWord(report, templateType);
  }

  async generatePdf(id: number): Promise<Buffer> {
    const report = await this.findOne(id);
    if (!report) throw new NotFoundException('Report not found');
    return this.exportService.generatePdf(report);
  }

  // ===== IIA Standard 6.3: Report Distribution & Dissemination =====
  async distributeReport(
    reportId: number,
    recipients: {
      recipientUserId?: number;
      recipientName: string;
      recipientEmail?: string;
      recipientRole?: string;
      organizationUnit?: string;
      distributionChannel?: string;
    }[],
  ): Promise<ReportDistribution[]> {
    const report = await this.findOne(reportId);
    if (!report) throw new NotFoundException(`Audit Report #${reportId} not found`);

    const entities = recipients.map((r) =>
      this.distRepo.create({
        reportId,
        recipientUserId: r.recipientUserId,
        recipientName: r.recipientName,
        recipientEmail: r.recipientEmail,
        recipientRole: r.recipientRole || 'AuditeeHead',
        organizationUnit: r.organizationUnit,
        distributionChannel: r.distributionChannel || 'SystemPortal',
        status: 'Sent',
      }),
    );

    return this.distRepo.save(entities);
  }

  async getDistributions(reportId: number): Promise<ReportDistribution[]> {
    return this.distRepo.find({
      where: { reportId },
      order: { sentAt: 'DESC' },
    });
  }

  async markReportRead(distributionId: number): Promise<ReportDistribution> {
    const dist = await this.distRepo.findOne({ where: { id: distributionId } });
    if (!dist) throw new NotFoundException(`Distribution #${distributionId} not found`);
    if (dist.status === 'Sent' || dist.status === 'Delivered') {
      dist.status = 'Read';
      dist.readAt = new Date();
      return this.distRepo.save(dist);
    }
    return dist;
  }

  async acknowledgeReport(
    distributionId: number,
    notes: string,
  ): Promise<ReportDistribution> {
    const dist = await this.distRepo.findOne({ where: { id: distributionId } });
    if (!dist) throw new NotFoundException(`Distribution #${distributionId} not found`);
    dist.status = 'Acknowledged';
    dist.acknowledgedAt = new Date();
    dist.acknowledgementNotes = notes || '';
    return this.distRepo.save(dist);
  }

  async getDistributionStats(reportId: number) {
    const distributions = await this.getDistributions(reportId);
    const total = distributions.length;
    if (total === 0) {
      return { total: 0, read: 0, acknowledged: 0, pending: 0, ackRate: 0 };
    }

    const read = distributions.filter((d) => d.status === 'Read' || d.status === 'Acknowledged').length;
    const acknowledged = distributions.filter((d) => d.status === 'Acknowledged').length;
    const pending = distributions.filter((d) => d.status === 'Sent' || d.status === 'Delivered').length;

    return {
      total,
      read,
      acknowledged,
      pending,
      readRate: Math.round((read / total) * 100),
      ackRate: Math.round((acknowledged / total) * 100),
    };
  }
}
