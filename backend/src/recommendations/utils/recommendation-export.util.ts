import * as ExcelJS from 'exceljs';
import { Recommendation } from '../entities/recommendation.entity';
import { AuditFinding } from '../../audit-findings/entities/audit-finding.entity';

export class RecommendationExportUtil {
  static async buildWorkbook(
    recs: Recommendation[],
    findings: AuditFinding[],
  ): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();

    const addSheet = (sheetName: string, data: any[]) => {
      const ws = wb.addWorksheet(sheetName);
      if (data.length > 0) {
        ws.columns = Object.keys(data[0]).map((key) => ({ header: key, key }));
        data.forEach((item) => ws.addRow(item));
      }
    };

    addSheet(
      'Findings',
      findings.map((f) => ({
        'Mã sai phạm': f.findingCode,
        'Tiêu đề': f.findingTitle,
        'Mức rủi ro': f.riskLevel,
        'Trạng thái': f.status,
        'Mã lỗi nội bộ': f.legacyInternalDefectCode || '',
        'Mã vi phạm Nghị định 340': f.legacyNd340DefectCode || '',
        'Mã vi phạm Nhân sự': f.legacyNhanSuDefectCode || '',
        'Số tiền phạt (VND)': f.actualFineAmount || 0,
        'Số CIF / Tài khoản': f.cifOrAccount || '',
        'Tên khách hàng': f.customerName || '',
        'CB đề xuất': f.legacyProposerOfficer || '',
        'CB thẩm định': f.legacyAppraiserOfficer || '',
        'Lãnh đạo duyệt': f.legacyBusinessLeader || '',
        'Cuộc kiểm toán': f.engagement?.name || '',
        'Phân đoạn': f.workstream?.title || '',
        'Giấy làm việc': f.workingPaper?.title || '',
        'Thực trạng / Sai phạm': f.condition,
        'Căn cứ / Chuẩn mực': f.criteria || '',
        'Nguyên nhân': f.cause,
        'Hậu quả': f.consequence,
        'Khuyến nghị': f.recommendation,
        'Ý kiến giải trình ĐVKD': f.auditeeResponse || '',
      })),
    );

    addSheet(
      'Recommendations',
      recs.map((r) => ({
        recommendationId: r.id,
        findingId: r.findingId,
        finding: r.finding,
        recommendation: r.recommendation,
        legacyDepartment: r.legacyDepartment,
        assignedTo: r.assignedTo,
        auditeeOwnerName: r.auditeeOwnerName,
        ktnbReviewerName: r.ktnbReviewerName,
        dueDate: r.dueDate,
        slaStatus: r.slaStatus || 'ChuaDenHan',
        selfMonitored: r.selfMonitored ? 'Yes' : 'No',
        selfMonitorFrequency: r.selfMonitorFrequency || '',
        closedReason: r.closedReason || '',
        status: r.status,
        closureStatus: r.closureStatus,
        progressPercent: r.progressPercent,
        escalationLevel: r.escalationLevel,
        teamLeadClosureOpinion: r.teamLeadClosureOpinion,
        completedAt: r.completedAt,
        closedAt: r.closedAt,
      })),
    );

    addSheet(
      'TrackingStatus',
      recs.map((r) => ({
        recommendationId: r.id,
        remediationPlan: r.remediationPlan,
        auditeeTargetDate: r.auditeeTargetDate,
        auditeeNotes: r.auditeeNotes,
        response: r.response,
        verificationNotes: r.verificationNotes,
        ktnbReviewNotes: r.ktnbReviewNotes,
        ktnbReviewedAt: r.ktnbReviewedAt,
        teamLeadClosureOpinionAt: r.teamLeadClosureOpinionAt,
      })),
    );

    addSheet(
      'OwnersAndReviewers',
      recs.map((r) => ({
        recommendationId: r.id,
        auditeeOwnerId: r.auditeeOwnerId,
        auditeeOwnerName: r.auditeeOwnerName,
        ktnbReviewerId: r.ktnbReviewerId,
        ktnbReviewerName: r.ktnbReviewerName,
        assignedToId: r.assignedToId,
        assignedTo: r.assignedTo,
        teamLeadClosureOpinionBy: r.teamLeadClosureOpinionBy,
        teamLeadClosureOpinionByName: r.teamLeadClosureOpinionByName,
      })),
    );

    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }
}
