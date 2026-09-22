import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { AuditEngagement } from '../../audit-engagements/entities/audit-engagement.entity';
import { DigitalSignature } from './digital-signature.entity';

@Entity('audit_reports')
export class AuditReport {
  @PrimaryGeneratedColumn()
  id: number;

  // FK → Cuộc kiểm toán
  @ManyToOne(() => AuditEngagement, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'engagementId' })
  engagement: AuditEngagement;

  @Column({ nullable: true })
  engagementId: number;

  @Column({ nullable: true })
  plan: string; // Denormalized: Tên Kế hoạch

  @Column({ nullable: true })
  reportCode: string;

  @Column({ nullable: true })
  reportType: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  executiveSummary: string; // Tóm tắt báo cáo

  @Column({ type: 'text', nullable: true })
  scope: string; // Phạm vi kiểm toán

  @Column({ type: 'text', nullable: true })
  methodology: string; // Phương pháp kiểm toán

  @Column({ type: 'text', nullable: true })
  overallConclusion: string; // Kết luận tổng thể

  @Column({ type: 'text', nullable: true })
  managementEvaluation: string; // Đánh giá công tác quản trị và điều hành

  @Column({ type: 'text', nullable: true })
  internalControlEvaluation: string; // Đánh giá hiệu quả KSNB

  @Column({ type: 'text', nullable: true })
  recommendationsForAuditee: string; // Kiến nghị đối với đơn vị được kiểm toán

  @Column({ type: 'text', nullable: true })
  recommendationsForCEO: string; // Kiến nghị đối với Tổng giám đốc

  @Column({ nullable: true })
  auditRating: string; // Satisfactory | NeedsImprovement | Unsatisfactory

  // ===== IIA Standard 15.1: Statement of Conformance =====
  @Column({
    type: 'text',
    default:
      'Cuộc kiểm toán này được thực hiện tuân thủ đầy đủ theo Bộ Chuẩn mực Thực hành Chuyên môn Quốc tế về Kiểm toán Nội bộ (IIA Global Internal Audit Standards 2024) và Thông tư 13/2018/TT-NHNN.',
  })
  conformanceStatement: string;

  @Column({ default: false })
  hasNonConformance: boolean;

  @Column({ type: 'text', nullable: true })
  nonConformanceDetails: string;
  // ===== End IIA Standard 15.1 =====

  @Column({ default: 'MB01B' })
  reportTemplateType: string; // MB01B (Báo cáo Chi nhánh) | MB02B (Báo cáo PGDBĐ)

  @Column({ nullable: true })
  postalDepartmentName: string; // Bưu điện tỉnh Nghệ An / BĐX...

  @Column({ type: 'text', nullable: true })
  vietnamPostRecipient: string; // Nơi nhận: Tổng công ty Bưu điện Việt Nam, Bưu điện tỉnh...

  @Column({ default: 'Draft' })
  status: string; // Draft | PendingReview | Reviewed | Issued | Archived

  @Column({ nullable: true })
  date: string; // Ngày phát hành

  @Column({ nullable: true })
  issuedBy: string; // Người phát hành

  @Column({ nullable: true })
  reportNo: string;

  @Column({ nullable: true })
  branchName: string;

  @Column({ nullable: true })
  branchCode: string;

  @Column({ nullable: true })
  auditeeUnit: string;

  @Column({ nullable: true })
  targetAuditProcess: string;

  @Column({ nullable: true })
  decisionNo: string;

  @Column({ nullable: true })
  decisionDate: string;

  @Column({ nullable: true })
  planningPeriod: string;

  @Column({ nullable: true })
  fieldworkPeriod: string;

  @Column({ nullable: true })
  reportingPeriod: string;

  @Column({ nullable: true })
  leadAuditorName: string;

  @Column({ type: 'text', nullable: true })
  teamMembers: string;

  @Column({ nullable: true })
  issueLocation: string;

  @Column({ nullable: true })
  auditDate: string;

  @Column({ nullable: true })
  branchRatingCreditPersonal: string;

  @Column({ nullable: true })
  branchRatingCreditCorporate: string;

  @Column({ nullable: true })
  branchRatingNonCredit: string;

  @Column({ nullable: true })
  branchRatingPgdbd: string;

  @Column({ nullable: true })
  branchOverallRating: string;

  @Column({ type: 'jsonb', nullable: true })
  recommendationsList: any[];

  @Column({ default: false })
  isSigned: boolean; // Đã ký số chưa

  @Column({ type: 'timestamp', nullable: true })
  signedAt: Date; // Thời điểm ký

  @OneToOne(() => DigitalSignature, (signature) => signature.report)
  signature: DigitalSignature;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'int', default: 0 })
  managerReviewCount: number; // Đếm số lần Lãnh đạo Phòng review/yêu cầu sửa Báo cáo

  @Column({ type: 'jsonb', default: () => "'[]'" })
  reviewHistory: {
    reviewerId: number;
    reviewerName: string;
    role: string;
    reviewedAt: string;
    fromStatus: string;
    toStatus: string;
    reviewNotes?: string;
  }[];

  @Column({ type: 'jsonb', nullable: true })
  customFields: Record<string, any>;

  // --- Background Jobs Tracking ---
  @Column({ nullable: true })
  exportJobId: string; // BullMQ job ID

  @Column({ default: 'Idle' })
  exportStatus: string; // Idle | Processing | Completed | Failed

  @Column({ nullable: true })
  exportFileUrl: string; // Path or URL to the generated file

  @Column({ nullable: true })
  signJobId: string;

  @Column({ default: 'Idle' })
  signStatus: string; // Idle | Processing | Completed | Failed
}
