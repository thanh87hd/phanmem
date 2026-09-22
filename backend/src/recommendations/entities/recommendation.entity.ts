import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditFinding } from '../../audit-findings/entities/audit-finding.entity';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';
import {
  RecommendationStatus,
  RecommendationClosureStatus,
  RecommendationSlaStatus,
  RiskAcceptanceStatus,
} from './recommendation.enums';

export * from './recommendation.enums';

@Entity('recommendations')
export class Recommendation {
  @PrimaryGeneratedColumn()
  id: number;

  // FK → Phát hiện kiểm toán
  @ManyToOne(() => AuditFinding, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'findingId' })
  auditFinding: AuditFinding;

  @Column({ nullable: true })
  findingId: number;

  @Column()
  finding: string; // Denormalized: Tiêu đề phát hiện

  @Column({ type: 'text' })
  recommendation: string; // Nội dung kiến nghị

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'departmentId' })
  departmentEntity: Department;

  @Column({ nullable: true })
  departmentId: number;

  @Column({ name: 'department', nullable: true })
  legacyDepartment: string; // Đơn vị chịu trách nhiệm

  // FK → Người chịu trách nhiệm
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignedToId' })
  assignedToUser: User;

  @Column({ nullable: true })
  assignedToId: number;

  @Column({ nullable: true })
  assignedTo: string; // Denormalized: Tên người chịu trách nhiệm

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'auditeeOwnerId' })
  auditeeOwnerUser: User;

  @Column({ nullable: true })
  auditeeOwnerId: number;

  @Column({ nullable: true })
  auditeeOwnerName: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ktnbReviewerId' })
  ktnbReviewerUser: User;

  @Column({ nullable: true })
  ktnbReviewerId: number;

  @Column({ nullable: true })
  evidenceFileUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  customFields: Record<string, any>;

  @Column({ nullable: true })
  ktnbReviewerName: string;

  @Column({ nullable: true })
  dueDate: string; // Hạn hoàn thành (SLA)

  @Column({ default: 'NotStarted' })
  status: string; // NotStarted | InProgress | Completed | Overdue | Verified

  @Column({ type: 'int', default: 0 })
  progressPercent: number; // 0-100

  @Column({ type: 'text', nullable: true })
  response: string; // Phản hồi/giải trình từ ĐVĐKT

  @Column({ nullable: true })
  evidenceLink: string; // Đường dẫn (URL) scan bằng chứng nhanh

  @Column({ type: 'text', nullable: true })
  remediationPlan: string; // Kế hoạch khắc phục cụ thể (Nội dung khắc phục)

  @Column({ default: true })
  remediationFeasibility: boolean; // Đánh giá khả năng khắc phục (Có/Không)

  @Column({ type: 'text', nullable: true })
  remediationUnfeasibleReason: string; // Nguyên nhân (Nếu không khắc phục được)

  @Column({ type: 'text', nullable: true })
  auditeeProposal: string; // Đề xuất của Đơn vị được kiểm toán

  @Column({ nullable: true })
  monitoringCycle: string; // Kỳ theo dõi (theo tháng, ví dụ: "Tháng 05/2026")

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'auditeeUnitHeadUserId' })
  auditeeUnitHeadUser: User;

  @Column({ nullable: true })
  auditeeUnitHeadUserId: number;

  @Column({ name: 'auditeeUnitHead', nullable: true })
  legacyAuditeeUnitHead: string; // Trưởng đơn vị được kiểm toán

  @Column({ nullable: true })
  region: string; // Vùng quản lý: Vùng 1 (Miền Bắc), Vùng 2 (Miền Trung), Vùng 3 (Miền Nam)...

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'auditeePocUserId' })
  auditeePocUser: User;

  @Column({ nullable: true })
  auditeePocUserId: number;

  @Column({ name: 'auditeePoc', nullable: true })
  legacyAuditeePoc: string; // Nhân sự đầu mối phụ trách của đơn vị

  @Column({ nullable: true })
  auditeeTargetDate: string; // Ngày đơn vị cam kết hoàn thành

  @Column({ type: 'text', nullable: true })
  auditeeNotes: string; // Ghi chú bổ sung từ đơn vị (Ghi chú chung)

  @Column({ type: 'text', nullable: true })
  verificationNotes: string; // Ghi chú xác nhận từ KTV (Ý kiến của Đoàn kiểm toán)

  @Column({ default: 'Open' })
  closureStatus: string; // Open | PendingAuditeeAction | PendingKTNBReview | PendingTeamLeadOpinion | Closed

  @Column({ type: 'text', nullable: true })
  ktnbReviewNotes: string;

  @Column({ type: 'timestamp', nullable: true })
  ktnbReviewedAt: Date;

  @Column({ nullable: true })
  ktnbReviewedBy: number;

  @Column({ type: 'text', nullable: true })
  teamLeadClosureOpinion: string;

  @Column({ nullable: true })
  teamLeadClosureOpinionBy: number;

  @Column({ nullable: true })
  teamLeadClosureOpinionByName: string;

  @Column({ type: 'timestamp', nullable: true })
  teamLeadClosureOpinionAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date;

  @Column({ nullable: true })
  closedBy: number;

  @Column({ type: 'int', default: 0 })
  escalationLevel: number; // 0: Bình thường, 1: Trễ hạn 15 ngày (Cảnh báo GĐ Chi nhánh), 2: Trễ hạn 30 ngày (Cảnh báo GĐ Vùng / Phó TGĐ), 3: Trễ hạn 60 ngày (Báo cáo trực tiếp BKS & CEO)

  @Column({ type: 'timestamp', nullable: true })
  escalatedAt: Date;

  @Column({ default: 'ChuaDenHan' })
  slaStatus: string; // ChuaDenHan | QuaHan | GiaHan

  @Column({ default: false })
  selfMonitored: boolean;

  @Column({ type: 'text', nullable: true })
  selfMonitorFrequency: string | null;

  // ===== IIA Standard 7.3: Risk Acceptance Workflow =====
  @Column({ default: 'NotRequested' })
  riskAcceptanceStatus: string; // NotRequested | Requested | PendingCAE | PendingBKS | Accepted | Rejected

  @Column({ type: 'text', nullable: true })
  riskAcceptanceReason: string; // Lý do xin chấp nhận rủi ro

  @Column({ nullable: true })
  riskAcceptanceRequestedById: number;

  @Column({ nullable: true })
  riskAcceptanceRequestedByName: string;

  @Column({ type: 'timestamp', nullable: true })
  riskAcceptanceRequestedAt: Date;

  @Column({ nullable: true })
  riskAcceptanceApprovedById: number; // CAE hoặc HĐQT/BKS

  @Column({ nullable: true })
  riskAcceptanceApprovedByName: string;

  @Column({ type: 'timestamp', nullable: true })
  riskAcceptanceApprovedAt: Date;

  @Column({ type: 'text', nullable: true })
  riskAcceptanceNotes: string; // Ghi chú phê duyệt chấp nhận rủi ro
  // ===== End Risk Acceptance =====

  @Column({ type: 'text', nullable: true })
  closedReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
