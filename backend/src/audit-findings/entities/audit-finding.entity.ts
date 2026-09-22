import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  BeforeInsert,
  BeforeUpdate,
  AfterLoad,
} from 'typeorm';
import { WorkingPaper } from '../../working-papers/entities/working-paper.entity';
import { AuditEngagement } from '../../audit-engagements/entities/audit-engagement.entity';
import { AuditWorkstream } from '../../audit-engagements/entities/audit-workstream.entity';
import { AuditSample } from './audit-sample.entity';
import { AuditMinute } from './audit-minute.entity';
import { AuditFindingPersonnel } from './audit-finding-personnel.entity';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';
import { AuditUniverse } from '../../audit-universe/entities/audit-universe.entity';
import { DefectCode } from '../../ai/entities/defect-code.entity';
import { Recommendation } from '../../recommendations/entities/recommendation.entity';

@Index(['engagementId', 'status', 'riskLevel'])
@Index(['findingCode'])
@Index(['workingPaperId'])
@Entity('audit_findings')
export class AuditFinding {
  @PrimaryGeneratedColumn()
  id: number;

  // FK → Working Paper
  @ManyToOne(() => WorkingPaper, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'workingPaperId' })
  workingPaper: WorkingPaper;

  @Column({ nullable: true })
  workingPaperId: number;

  @Column({ nullable: true })
  wpTitle: string; // Denormalized

  // FK → Cuộc kiểm toán
  @ManyToOne(() => AuditEngagement, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'engagementId' })
  engagement: AuditEngagement;

  @Column({ nullable: true })
  engagementId: number;

  @ManyToOne(() => AuditWorkstream, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'workstreamId' })
  workstream: AuditWorkstream;

  @Column({ nullable: true })
  workstreamId: number;

  @Column()
  findingTitle: string;

  @Column({ nullable: true })
  findingCode: string; // Mã phát hiện: FD-001...

  @Column({ nullable: true })
  branchCode: string; // Mã Chi nhánh vi phạm

  @Column({ nullable: true })
  region: string; // Vùng quản lý: Vùng 1 (Miền Bắc), Vùng 2 (Miền Trung), Vùng 3 (Miền Nam)...

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'managingBranchId' })
  managingBranch: Department;

  @Column({ nullable: true })
  managingBranchId: number;

  @Column({ nullable: true })
  managingBranchCode: string; // Mã Chi nhánh quản lý

  @Column({ nullable: true })
  managingBranchName: string; // Tên Chi nhánh quản lý

  @Column({ nullable: true })
  operationType: string; // Nghiệp vụ: TD (Tín dụng), PTD (Phi tín dụng), TKBĐ (Tiết kiệm Bưu điện)

  @ManyToOne(() => AuditUniverse, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'businessProcessId' })
  businessProcessEntity: AuditUniverse;

  @Column({ nullable: true })
  businessProcessId: number;

  @Column({ nullable: true })
  businessProcess: string; // Quy trình nghiệp vụ vi phạm

  @Column({ nullable: true })
  cifOrAccount: string; // Số CIF hoặc Số tài khoản liên quan

  @Column({ nullable: true })
  customerName: string; // Tên khách hàng vi phạm

  @Column({ nullable: true })
  productName: string; // Tên sản phẩm lỗi

  @Column({ nullable: true })
  customerType: string; // Loại KH (KHCN / KHDN)

  @Column({ type: 'text' })
  condition: string; // Hiện trạng (Nội dung sai phạm chi tiết)

  @Column({ nullable: true })
  channel: string; // Kênh phát sinh: CN (Chi nhánh) | PGDBD (Phòng Giao dịch Bưu điện) | ATM_CDM | CoreBanking

  @Column({ nullable: true })
  findingCategory: string; // Nghiệp vụ: TD (Tín dụng) | PTD (Phi tín dụng) | PGDBD (Tiết kiệm bưu điện) | KeToan | CNTT

  @Column({ nullable: true })
  violationHistory: string; // Lịch sử/tính chất: Lần đầu | Lặp lại | Hệ thống | Chủ quan | Khách quan

  @Column({ nullable: true })
  postalAgencyCode: string; // Mã bưu cục / Bưu điện xã (nếu thuộc kênh PGDBĐ)

  @Column({ nullable: true })
  riskGroupGeneral: string; // Nhóm rủi ro tổng hợp

  @Column({ nullable: true })
  riskGroupDetail: string; // Nhóm rủi ro chi tiết

  @Column({ type: 'text' })
  consequence: string; // Hậu quả

  @Column({ type: 'text' })
  cause: string; // Nguyên nhân

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'proposerUserId' })
  proposerUser: User;

  @Column({ nullable: true })
  proposerUserId: number;

  @Column({ nullable: true })
  proposerOfficer: string; // CB Đề xuất hồ sơ lỗi

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'appraiserUserId' })
  appraiserUser: User;

  @Column({ nullable: true })
  appraiserUserId: number;

  @Column({ nullable: true })
  appraiserOfficer: string; // CB Thẩm định hồ sơ lỗi

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'businessLeaderUserId' })
  businessLeaderUser: User;

  @Column({ nullable: true })
  businessLeaderUserId: number;

  @Column({ nullable: true })
  businessLeader: string; // CB Lãnh đạo DVKD phê duyệt lỗi

  @Column({ nullable: true })
  rootCauseCategory: string; // Process | People | System | External

  @Column({ type: 'text', nullable: true })
  rootCauseDetails: string; // Chi tiết phân tích 5-Whys / Fishbone

  @OneToMany(() => Recommendation, (rec) => rec.auditFinding, {
    cascade: ['insert', 'update'],
  })
  recommendations?: Recommendation[];

  @Column({ type: 'text' })
  recommendation: string; // Khuyến nghị dạng chuỗi (Dual-read/write theo ADR-0010)

  // Compatibility aliases for legacy access
  legacyManagingBranchCode?: string;
  legacyManagingBranchName?: string;
  legacyBusinessProcess?: string;
  legacyProposerOfficer?: string;
  legacyAppraiserOfficer?: string;
  legacyBusinessLeader?: string;
  legacyRecommendation?: string;

  @BeforeInsert()
  @BeforeUpdate()
  syncLegacyFields() {
    if (this.legacyManagingBranchCode && !this.managingBranchCode) {
      this.managingBranchCode = this.legacyManagingBranchCode;
    }
    if (this.legacyManagingBranchName && !this.managingBranchName) {
      this.managingBranchName = this.legacyManagingBranchName;
    }
    if (this.legacyBusinessProcess && !this.businessProcess) {
      this.businessProcess = this.legacyBusinessProcess;
    }
    if (this.legacyProposerOfficer && !this.proposerOfficer) {
      this.proposerOfficer = this.legacyProposerOfficer;
    }
    if (this.legacyAppraiserOfficer && !this.appraiserOfficer) {
      this.appraiserOfficer = this.legacyAppraiserOfficer;
    }
    if (this.legacyBusinessLeader && !this.businessLeader) {
      this.businessLeader = this.legacyBusinessLeader;
    }
    if (this.legacyRecommendation && !this.recommendation) {
      this.recommendation = this.legacyRecommendation;
    }
    if (this.recommendation && !this.legacyRecommendation) {
      this.legacyRecommendation = this.recommendation;
    }
  }

  @AfterLoad()
  populateLegacyFields() {
    this.legacyManagingBranchCode = this.managingBranchCode;
    this.legacyManagingBranchName = this.managingBranchName;
    this.legacyBusinessProcess = this.businessProcess;
    this.legacyProposerOfficer = this.proposerOfficer;
    this.legacyAppraiserOfficer = this.appraiserOfficer;
    this.legacyBusinessLeader = this.businessLeader;
    this.legacyRecommendation = this.recommendation;
  }

  @Column({ nullable: true })
  recommendationTarget: string; // Đối tượng được kiến nghị (HĐQT/TGĐ/ĐVKD/HO)

  @Column({ default: 'Publish' })
  recommendationType: string; // Loại kiến nghị (Lưu ý / Phát hành)

  @Column()
  riskLevel: string; // Mức độ rủi ro: Critical | High | Medium | Low

  @Column({ default: 'Open' })
  status: string; // Open | Confirmed | Disputed | Closed | Resolved

  @Column({ type: 'text', nullable: true })
  auditeeResponse: string; // Phản hồi giải trình từ ĐVĐKT

  @Column({ type: 'text', nullable: true })
  criteria: string; // Chuẩn mực/Quy định vi phạm

  @Column({ nullable: true })
  findingNature: string; // 'HeThong' | 'TuanThu' | 'CaNhan'

  @Column({ nullable: true })
  reportedByAuditorId: number;

  @Column({ nullable: true })
  responsibleUnitId: number;

  @Column({ type: 'json', nullable: true })
  appendices: { name: string; fileUrl: string; type: string }[];

  // Reverse relation: Samples linked to this finding
  @OneToMany(() => AuditSample, (sample) => sample.finding)
  linkedSamples: AuditSample[];

  @ManyToOne(() => AuditMinute, (minute) => minute.findings, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'minuteId' })
  minute: AuditMinute;

  @Column({ nullable: true })
  minuteId: number;

  @OneToMany(() => AuditFindingPersonnel, (personnel) => personnel.finding, {
    cascade: true,
  })
  personnel: AuditFindingPersonnel[];

  @ManyToOne(() => DefectCode, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'internalDefectCodeId' })
  internalDefectCodeEntity: DefectCode;

  @Column({ nullable: true })
  internalDefectCodeId: number;

  @Column({ name: 'internalDefectCode', nullable: true })
  legacyInternalDefectCode: string;

  @ManyToOne(() => DefectCode, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'nd340DefectCodeId' })
  nd340DefectCodeEntity: DefectCode;

  @Column({ nullable: true })
  nd340DefectCodeId: number;

  @Column({ name: 'nd340DefectCode', nullable: true })
  legacyNd340DefectCode: string;

  @ManyToOne(() => DefectCode, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'nhanSuDefectCodeId' })
  nhanSuDefectCodeEntity: DefectCode;

  @Column({ nullable: true })
  nhanSuDefectCodeId: number;

  @Column({ name: 'nhanSuDefectCode', nullable: true })
  legacyNhanSuDefectCode: string;

  @Column({ type: 'float', nullable: true })
  actualFineAmount: number;

  @Column({ default: 1 })
  repeatCount: number; // Số lần phát hiện tái diễn qua các kỳ kiểm toán

  @Column({ nullable: true })
  themeId: string; // Mã liên kết phân tích chuyên đề: TH-2026-001...

  @Column({ nullable: true })
  riskRegisterId: number; // Liên kết tới rủi ro cụ thể trong Sổ đăng ký rủi ro

  @Column({ type: 'numeric', nullable: true })
  financialExposure: number; // Giá trị tài chính bị ảnh hưởng / phơi nhiễm

  @Column({ nullable: true })
  agingBucket: string; // Phân loại tuổi phát hiện: '0-30 ngày' | '31-90 ngày' | '91-180 ngày' | '>180 ngày'

  @Column({ default: 0 })
  daysOpen: number; // Số ngày từ lúc phát hiện

  @Column({ default: 0 })
  daysOverdue: number; // Số ngày quá hạn khắc phục

  @Column({ type: 'jsonb', nullable: true })
  customFields: Record<string, any>;

  @VersionColumn({ default: 1 })
  version: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
