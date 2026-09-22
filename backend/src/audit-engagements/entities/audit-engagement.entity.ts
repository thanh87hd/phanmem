import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { AuditPlan } from '../../audit-plans/entities/audit-plan.entity';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';
import { AuditWorkstream } from './audit-workstream.entity';

@Entity('audit_engagements')
export class AuditEngagement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // Tên cuộc kiểm toán (vd: "KT Quy trình Tín dụng Q1/2026")

  // FK → Kế hoạch kiểm toán năm
  @ManyToOne(() => AuditPlan, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'planId' })
  plan: AuditPlan;

  @Column({ nullable: true })
  planId: number;

  @Column({ name: 'planName', nullable: true })
  legacyPlanName: string; // Denormalized for display

  @Column({ type: 'date', nullable: true })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  endDate: string;

  @Column({ nullable: true })
  engagementCode: string;

  @Column({ type: 'jsonb', nullable: true })
  customFields: Record<string, any>;

  @Column({ nullable: true })
  decisionNo: string;

  @Column({ type: 'date', nullable: true })
  decisionDate: string;

  @Column({ type: 'date', nullable: true })
  planningStartDate: string;

  @Column({ type: 'date', nullable: true })
  planningEndDate: string;

  @Column({ type: 'date', nullable: true })
  fieldworkStartDate: string;

  @Column({ type: 'date', nullable: true })
  fieldworkEndDate: string;

  @Column({ default: 'Planning' })
  status: string; // Planning | Fieldwork | Reporting | Completed | Cancelled

  @Column({ default: 'Open' })
  workspaceStatus: string; // Open | InProgress | ReadyToClose | Closed

  @Column({ nullable: true })
  sourceRiskAssessmentId: number;

  @Column({ nullable: true })
  sourceAuditUniverseId: number;

  @Column({ nullable: true })
  riskLevel: string;

  @Column({ type: 'float', nullable: true })
  residualRiskScore: number;

  @Column({ default: 'Planned' })
  engagementType: string; // Planned | Unplanned | FollowUp | Special

  @Column({ default: 'PKT_DVKD' })
  ownerTeam: string; // PKT_HoiSo | PKT_DVKD | TongHop

  @Column({ nullable: true })
  auditCategory: string; // HoiSo | ChiNhanh | PGDBD_TKBD | PGD | HeThong | ChuyenDe

  @Column({ nullable: true })
  branchCode: string; // Mã chi nhánh (cho ĐVKD)

  @Column({ nullable: true })
  branchName: string; // Tên chi nhánh

  @Column({ nullable: true })
  postalDepartmentName: string; // Tên Bưu điện tỉnh/huyện (vd: Bưu điện tỉnh Nghệ An / BĐX Quỳ Hợp)

  @Column({ type: 'text', nullable: true })
  postalRepresentative: string; // Đại diện Bưu điện (vd: KSV Lê Thị Thúy Hằng, GDV Nguyễn Thị Lan Hương)

  @Column({ type: 'text', nullable: true })
  recipientList: string; // Nơi nhận báo cáo (HĐQT, BKS, TGĐ, VietnamPost, BĐT...)

  @Column({ type: 'text', nullable: true })
  unplannedReason: string; // Lý do đột xuất

  @Column({ nullable: true })
  requestedBy: string; // Ai yêu cầu KT đột xuất

  @Column({ type: 'text', nullable: true })
  scope: string; // Phạm vi kiểm toán

  @Column({ type: 'text', nullable: true })
  objective: string; // Mục tiêu kiểm toán

  // FK → Trưởng đoàn
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'leadAuditorId' })
  leadAuditorUser: User;

  @Column({ nullable: true })
  leadAuditorId: number;

  @Column({ name: 'leadAuditor', nullable: true })
  legacyLeadAuditor: string; // Denormalized for display

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'auditedDepartmentId' })
  auditedDepartment: Department;

  @Column({ nullable: true })
  auditedDepartmentId: number;

  @Column({ name: 'auditedDepartment', nullable: true })
  legacyAuditedDepartment: string; // Đơn vị được kiểm toán

  @Column({ type: 'jsonb', nullable: true })
  teamMembers: { userId: number; fullName: string; role: string }[];

  @Column({ type: 'int', nullable: true })
  budgetDays: number; // Ngày công dự kiến

  @Column({ type: 'float', nullable: true })
  actualDays: number; // Ngày công thực tế

  @OneToMany(() => AuditWorkstream, (workstream) => workstream.engagement)
  workstreams: AuditWorkstream[];

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date;

  @Column({ nullable: true })
  closedBy: number;

  @Column({ type: 'text', nullable: true })
  closeNotes: string;

  @Column({ type: 'date', nullable: true })
  programValidity: string; // Thời hiệu chương trình KT

  @Column({ nullable: true })
  proposalDocUrl: string; // Link Tờ trình

  @Column({ nullable: true })
  outlineDocUrl: string; // Link Đề cương

  @Column({ nullable: true })
  decisionDocUrl: string; // Link Quyết định thành lập ĐKT

  @Column({ nullable: true })
  samplingPlanDocUrl: string; // Link Kế hoạch chọn mẫu đã phê duyệt

  @Column({ default: 'Draft' })
  proposalStatus: string; // Draft | Submitted | Approved | Rework (Trạng thái KH Đề cương & Mẫu chọn)

  @Column({ type: 'timestamp', nullable: true })
  proposalSubmittedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  proposalApprovedAt: Date;

  @Column({ nullable: true })
  proposalApprovedBy: string;

  @Column({ type: 'text', nullable: true })
  proposalNotes: string; // Ý kiến chỉ đạo / Ghi chú phê duyệt KHĐC

  @Column({ default: 0 })
  proposalRevisionCount: number; // Số lần yêu cầu chỉnh sửa/review lại KHĐC (dùng tính KPI chất lượng lập KH)

  @Column({ type: 'simple-json', nullable: true })
  proposalReviewHistory: {
    iteration: number;
    action: 'SUBMIT' | 'REWORK' | 'APPROVE';
    actorId: number;
    actorName: string;
    role: string;
    timestamp: string;
    notes: string;
  }[];

  @Column({ default: false })
  isOfficialized: boolean; // Trạng thái chính thức hóa đoàn (Pha 2)

  @Column({ type: 'timestamp', nullable: true })
  officializedAt: Date; // Thời điểm chính thức hóa

  @Column({ nullable: true })
  officializedBy: string; // Người duyệt chính thức hóa đoàn

  @Column({ type: 'boolean', default: false, nullable: true })
  isExpectedInfo?: boolean; // Lưu dự kiến / Lưu nháp

  @Column({ type: 'text', nullable: true })
  auditedEntityList?: string; // Danh sách đối tượng kiểm toán

  @Column({ type: 'date', nullable: true })
  surveySentDate?: string;

  @Column({ type: 'date', nullable: true })
  surveyReceivedDate?: string;

  @Column({ type: 'date', nullable: true })
  handoverMinutesDate?: string;

  @Column({ type: 'date', nullable: true })
  detailedMinutesDate?: string;

  @Column({ type: 'date', nullable: true })
  summaryMinutesDate?: string;

  @Column({ type: 'date', nullable: true })
  exitMeetingDate?: string;

  @Column({ type: 'date', nullable: true })
  reportIssuedDate?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
