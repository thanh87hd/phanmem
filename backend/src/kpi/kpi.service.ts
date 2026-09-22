import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditPlan } from '../audit-plans/entities/audit-plan.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import { AuditReport } from '../audit-reports/entities/audit-report.entity';
import { WorkingPaper } from '../working-papers/entities/working-paper.entity';
import { ComplianceStatus } from './entities/compliance-status.entity';
import {
  MasterDataChangeRequest,
  ChangeRequestStatus,
} from '../system-management/entities/master-data-change-request.entity';

export interface KpiResult {
  id: string;
  metric: string;
  target: string;
  current: string;
  value: number;
  targetValue: number;
  status: 'Passed' | 'Warning' | 'Failed';
  category: string;
}

@Injectable()
export class KpiService {
  constructor(
    @InjectRepository(AuditPlan) private planRepo: Repository<AuditPlan>,
    @InjectRepository(AuditEngagement)
    private engRepo: Repository<AuditEngagement>,
    @InjectRepository(AuditFinding)
    private findingRepo: Repository<AuditFinding>,
    @InjectRepository(Recommendation)
    private recRepo: Repository<Recommendation>,
    @InjectRepository(AuditReport) private reportRepo: Repository<AuditReport>,
    @InjectRepository(WorkingPaper) private wpRepo: Repository<WorkingPaper>,
    @InjectRepository(ComplianceStatus)
    private complianceRepo: Repository<ComplianceStatus>,
    @InjectRepository(MasterDataChangeRequest)
    private changeRepo: Repository<MasterDataChangeRequest>,
  ) {}

  async calculateKpis(): Promise<KpiResult[]> {
    const kpis: KpiResult[] = [];

    // === KPI 1: Tỷ lệ hoàn thành Kế hoạch kiểm toán ===
    const totalEngagements = await this.engRepo.count();
    const completedEngagements = await this.engRepo.count({
      where: { status: 'Completed' },
    });
    const planCompletionRate =
      totalEngagements > 0
        ? Math.round((completedEngagements / totalEngagements) * 100)
        : 0;

    kpis.push({
      id: 'plan_completion',
      metric: 'Tỷ lệ hoàn thành Kế hoạch kiểm toán',
      target: '≥ 95%',
      current: `${planCompletionRate}%`,
      value: planCompletionRate,
      targetValue: 95,
      status:
        planCompletionRate >= 95
          ? 'Passed'
          : planCompletionRate >= 80
            ? 'Warning'
            : 'Failed',
      category: 'Hiệu quả',
    });

    // === KPI 2: Thời gian phát hành Báo cáo ===
    const issuedReports = await this.reportRepo.find({
      where: { status: 'Issued' },
    });
    let avgReportDays = 0;
    if (issuedReports.length > 0) {
      const totalDays = issuedReports.reduce((sum, r) => {
        if (r.date && r.createdAt) {
          const issued = new Date(r.date);
          const created = new Date(r.createdAt);
          return (
            sum +
            Math.ceil(
              (issued.getTime() - created.getTime()) / (1000 * 3600 * 24),
            )
          );
        }
        return sum;
      }, 0);
      avgReportDays = Math.round(totalDays / issuedReports.length);
    }

    kpis.push({
      id: 'report_time',
      metric: 'Thời gian phát hành Báo cáo trung bình',
      target: '≤ 15 ngày',
      current: issuedReports.length > 0 ? `${avgReportDays} ngày` : 'N/A',
      value: avgReportDays,
      targetValue: 15,
      status:
        avgReportDays <= 15
          ? 'Passed'
          : avgReportDays <= 20
            ? 'Warning'
            : 'Failed',
      category: 'Hiệu quả',
    });

    // === KPI 3: Tỷ lệ khắc phục kiến nghị đúng hạn ===
    const totalRecs = await this.recRepo.count();
    const completedRecs = await this.recRepo.count({
      where: [{ status: 'Completed' }, { status: 'Verified' }],
    });
    const overdueRecs = await this.recRepo.count({
      where: { status: 'Overdue' },
    });
    const onTimeRate =
      totalRecs > 0 ? Math.round((completedRecs / totalRecs) * 100) : 0;

    kpis.push({
      id: 'rec_completion',
      metric: 'Tỷ lệ khắc phục Kiến nghị',
      target: '≥ 90%',
      current: `${onTimeRate}%`,
      value: onTimeRate,
      targetValue: 90,
      status:
        onTimeRate >= 90 ? 'Passed' : onTimeRate >= 70 ? 'Warning' : 'Failed',
      category: 'Tuân thủ',
    });

    // === KPI 4: Số kiến nghị quá hạn ===
    kpis.push({
      id: 'overdue_recs',
      metric: 'Số kiến nghị quá hạn',
      target: '≤ 5',
      current: `${overdueRecs}`,
      value: overdueRecs,
      targetValue: 5,
      status:
        overdueRecs <= 5 ? 'Passed' : overdueRecs <= 10 ? 'Warning' : 'Failed',
      category: 'Tuân thủ',
    });

    // === KPI 5: Tỷ lệ WP được soát xét ===
    const totalWPs = await this.wpRepo.count();
    const approvedWPs = await this.wpRepo.count({
      where: { status: 'Approved' },
    });
    const wpReviewRate =
      totalWPs > 0 ? Math.round((approvedWPs / totalWPs) * 100) : 0;

    kpis.push({
      id: 'wp_review_rate',
      metric: 'Tỷ lệ WP được phê duyệt',
      target: '≥ 100%',
      current: `${wpReviewRate}%`,
      value: wpReviewRate,
      targetValue: 100,
      status:
        wpReviewRate >= 100
          ? 'Passed'
          : wpReviewRate >= 80
            ? 'Warning'
            : 'Failed',
      category: 'Chất lượng',
    });

    // === KPI 6: Số phát hiện rủi ro Cao/Nghiêm trọng ===
    const highFindings = await this.findingRepo.count({
      where: [{ riskLevel: 'High' }, { riskLevel: 'Critical' }],
    });

    kpis.push({
      id: 'high_risk_findings',
      metric: 'Phát hiện Rủi ro Cao/Nghiêm trọng',
      target: 'Thông tin',
      current: `${highFindings}`,
      value: highFindings,
      targetValue: 0,
      status:
        highFindings === 0
          ? 'Passed'
          : highFindings <= 5
            ? 'Warning'
            : 'Failed',
      category: 'Rủi ro',
    });

    // === KPI 7: Tỷ lệ tổng phát hiện được đồng thuận ===
    const totalFindings = await this.findingRepo.count();
    const confirmedFindings = await this.findingRepo.count({
      where: [
        { status: 'Confirmed' },
        { status: 'Closed' },
        { status: 'Resolved' },
      ],
    });
    const agreeRate =
      totalFindings > 0
        ? Math.round((confirmedFindings / totalFindings) * 100)
        : 0;

    kpis.push({
      id: 'finding_agree_rate',
      metric: 'Tỷ lệ phát hiện được đồng thuận',
      target: '≥ 85%',
      current: totalFindings > 0 ? `${agreeRate}%` : 'N/A',
      value: agreeRate,
      targetValue: 85,
      status:
        agreeRate >= 85 ? 'Passed' : agreeRate >= 70 ? 'Warning' : 'Failed',
      category: 'Chất lượng',
    });

    // === KPI 8: Nhận diện & Kiểm soát Rủi ro/Lỗi mới phát sinh trong năm (Emerging Risks) ===
    const approvedEmergingChanges = await this.changeRepo.count({
      where: {
        isMidYearAddition: true,
        status: ChangeRequestStatus.APPROVED,
      },
    });

    kpis.push({
      id: 'emerging_risks_identified',
      metric:
        'Số rủi ro & lỗi nghiệp vụ mới phát sinh được kiểm soát (BSC Emerging Risks)',
      target: '≥ 5 danh mục',
      current: `${approvedEmergingChanges} phát sinh mới`,
      value: approvedEmergingChanges,
      targetValue: 5,
      status:
        approvedEmergingChanges >= 5
          ? 'Passed'
          : approvedEmergingChanges >= 2
            ? 'Warning'
            : 'Failed',
      category: 'Quy trình & Học hỏi',
    });

    return kpis;
  }

  getComplianceChecklist() {
    // IIA Standards compliance checklist theo Thông tư 83/2025/TT-NHNN
    return {
      standard: 'IIA International Standards + Thông tư 83/2025/TT-NHNN',
      sections: [
        {
          id: 'attr',
          title: 'I. CHUẨN MỰC THUỘC TÍNH (Attribute Standards)',
          items: [
            {
              id: '1000',
              label: '1000 - Mục đích, Quyền hạn và Trách nhiệm',
              description: 'Điều lệ KTNB được phê duyệt bởi HĐQT/BKS',
            },
            {
              id: '1100',
              label: '1100 - Tính Độc lập và Khách quan',
              description:
                'KTNB báo cáo trực tiếp lên HĐQT/BKS. Không kiêm nhiệm nghiệp vụ kinh doanh.',
            },
            {
              id: '1200',
              label: '1200 - Năng lực và Sự thận trọng chuyên môn',
              description:
                'KTV có chứng chỉ CIA/CPA/ACCA. Đào tạo tối thiểu hàng năm theo yêu cầu.',
            },
            {
              id: '1300',
              label: '1300 - Chương trình Đảm bảo và Nâng cao Chất lượng',
              description:
                'Có QAIP bao gồm đánh giá nội bộ hàng năm và bên ngoài mỗi 5 năm.',
            },
          ],
        },
        {
          id: 'perf',
          title: 'II. CHUẨN MỰC THỰC HÀNH (Performance Standards)',
          items: [
            {
              id: '2000',
              label: '2000 - Quản lý Hoạt động KTNB',
              description:
                'Kế hoạch kiểm toán dựa trên đánh giá rủi ro, được phê duyệt bởi HĐQT/BKS.',
            },
            {
              id: '2100',
              label: '2100 - Bản chất Công việc',
              description:
                'Đánh giá quản trị, quản lý rủi ro và kiểm soát nội bộ.',
            },
            {
              id: '2200',
              label: '2200 - Lập Kế hoạch Cuộc KT',
              description:
                'Mỗi cuộc KT có mục tiêu, phạm vi, nguồn lực, chương trình KT cụ thể.',
            },
            {
              id: '2300',
              label: '2300 - Thực hiện Cuộc KT',
              description:
                'Thu thập đầy đủ bằng chứng. Lập Giấy tờ làm việc đúng chuẩn.',
            },
            {
              id: '2400',
              label: '2400 - Truyền đạt Kết quả',
              description:
                'Báo cáo kịp thời, chính xác, đầy đủ. Cấu trúc: Hiện trạng-Tiêu chí-Nguyên nhân-Hậu quả-Kiến nghị.',
            },
            {
              id: '2500',
              label: '2500 - Giám sát Tiến độ',
              description:
                'Theo dõi kiến nghị, SLA. Báo cáo tình trạng khắc phục lên HĐQT/BKS.',
            },
          ],
        },
        {
          id: 'tt83',
          title: 'III. THÔNG TƯ 83/2025/TT-NHNN (Quy định về Hệ thống KSNB)',
          items: [
            {
              id: 'tt83_1',
              label: 'Điều kiện tổ chức KTNB',
              description:
                'KTNB là đơn vị độc lập, báo cáo HĐQT/BKS theo chuẩn mới TT83.',
            },
            {
              id: 'tt83_2',
              label: 'Quản lý rủi ro nâng cao',
              description:
                'Áp dụng các kỹ thuật định lượng rủi ro trong đánh giá nội bộ.',
            },
            {
              id: 'tt83_3',
              label: 'Kế hoạch KTNB năm',
              description:
                'Kế hoạch linh hoạt, được phê duyệt và điều chỉnh phù hợp với hồ sơ rủi ro hiện tại.',
            },
            {
              id: 'tt83_4',
              label: 'Báo cáo KTNB định kỳ',
              description:
                'Báo cáo kết quả định kỳ lên NHNN đúng thời hạn theo TT83.',
            },
          ],
        },
      ],
    };
  }

  async getComplianceStatus() {
    const statuses = await this.complianceRepo.find();
    return statuses.reduce(
      (acc, curr) => {
        acc[curr.id] = curr.checked;
        return acc;
      },
      {} as Record<string, boolean>,
    );
  }

  async saveComplianceStatus(id: string, checked: boolean) {
    let status = await this.complianceRepo.findOne({ where: { id } });
    if (!status) {
      status = this.complianceRepo.create({ id, checked });
    } else {
      status.checked = checked;
    }
    await this.complianceRepo.save(status);
    return { success: true };
  }
}
