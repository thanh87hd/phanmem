import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditSampleBatch } from './audit-sample-batch.entity';
import { AuditFinding } from './audit-finding.entity';
import { SampleType, TestResult } from './sample-enums';
export { TestResult };

@Entity('audit_samples')
export class AuditSample {
  @PrimaryGeneratedColumn()
  id: number;

  // FK → Batch
  @ManyToOne(() => AuditSampleBatch, (batch) => batch.samples, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'batchId' })
  batch: AuditSampleBatch;

  @Column()
  batchId: number;

  @Column({ type: 'int', default: 0 })
  sequenceNo: number;

  @Column({
    type: 'varchar',
    length: 30,
    default: SampleType.DETAIL,
  })
  sampleType: SampleType;

  // ═══ DETAIL Sample Fields (CIF / Account / Transaction) ═══

  @Column({ nullable: true })
  cifOrAccount: string;

  @Column({ nullable: true })
  customerName: string;

  @Column({ nullable: true })
  customerType: string; // KHCN | KHDN

  @Column({ nullable: true })
  productName: string;

  @Column({ nullable: true })
  branchCode: string;

  @Column({ nullable: true })
  region: string;

  @Column({ nullable: true })
  managingBranchCode: string;

  @Column({ nullable: true })
  managingBranchName: string;

  @Column({ nullable: true })
  operationType: string; // TD | PTD | TKBĐ

  @Column({ nullable: true })
  businessProcess: string;

  @Column({ nullable: true })
  proposerOfficer: string;

  @Column({ nullable: true })
  appraiserOfficer: string;

  @Column({ nullable: true })
  businessLeader: string;

  // ═══ PROCESS_CONTROL Sample Fields ═══

  @Column({ nullable: true })
  controlPointId: string;

  @Column({ type: 'text', nullable: true })
  controlDescription: string;

  @Column({ nullable: true })
  controlFrequency: string; // Hàng ngày | Hàng tuần | Hàng tháng | Hàng năm

  // ═══ Test Result Fields ═══

  @Column({
    type: 'varchar',
    length: 20,
    default: TestResult.NOT_TESTED,
  })
  testResult: TestResult;

  @Column({ type: 'text', nullable: true })
  testNotes: string;

  @Column({ type: 'timestamp', nullable: true })
  testedAt: Date;

  @Column({ nullable: true })
  testedBy: string;

  @Column({ type: 'int', nullable: true })
  assignedAuditorId?: number | null;

  @Column({ type: 'varchar', nullable: true })
  assignedAuditorName?: string | null;

  // FK → Finding (optional: link this sample to a finding if it caused one)
  @ManyToOne(() => AuditFinding, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'findingId' })
  finding: AuditFinding;

  @Column({ nullable: true })
  findingId: number;

  @Column({ type: 'text', nullable: true })
  condition: string; // Chi tiết sai sót / hiện trạng mẫu vi phạm

  @Column({ type: 'float', nullable: true })
  loanAmount: number; // Dư nợ (tỷ đồng)

  @Column({ nullable: true })
  debtGroup: string; // Nhóm nợ (1 - 5)

  @Column({ type: 'text', nullable: true })
  loanPurpose: string; // Mục đích vay vốn

  @Column({ nullable: true })
  auditeeOfficer: string; // CVKH quản lý khoản vay

  @Column({ type: 'text', nullable: true })
  interviewAuditeeOfficer: string; // Kết quả phỏng vấn CB QLKH

  @Column({ default: false })
  fieldInspection: boolean; // Kiểm tra thực tế (Tick X)

  @Column({ type: 'text', nullable: true })
  fieldInspectionInfo: string; // Thông tin đi thực địa KH cần làm rõ

  @Column({ type: 'text', nullable: true })
  fieldInspectionResult: string; // Kết quả kiểm tra thực tế KH

  @Column({ type: 'text', nullable: true })
  preExplanationNote: string; // Nội dung ghi nhận trước giải trình

  @Column({ type: 'text', nullable: true })
  auditeeExplanation: string; // ĐVKD giải trình và hồ sơ bổ sung

  @Column({ type: 'text', nullable: true })
  auditorResponse: string; // Đoàn kiểm toán phản hồi giải trình của ĐVKD

  @Column({ type: 'text', nullable: true })
  postExplanationNote: string; // Nội dung ghi nhận sau giải trình

  @Column({ nullable: true })
  riskGroup: string; // Nhóm rủi ro (01. Thu thập hồ sơ KH, 02. Đề xuất thẩm định...)

  @Column({ nullable: true })
  riskCategory: string; // Danh mục rủi ro

  @Column({ type: 'text', nullable: true })
  detailedRisk: string; // Rủi ro chi tiết

  @Column({ type: 'text', nullable: true })
  violationCause: string; // Nguyên nhân vi phạm gốc rễ

  @Column({ nullable: true })
  violationCauseType: string; // Phân loại nguyên nhân (1. Cá nhân - Chủ quan, 2. Quy trình...)

  @Column({ nullable: true })
  inherentRisk: string; // Mức độ rủi ro cố hữu (Cao / Trung bình / Thấp)

  @Column({ nullable: true })
  controlQuality: string; // Chất lượng kiểm soát (Rất tốt, Tốt, Trung bình, Yếu, Rất yếu)

  @Column({ nullable: true })
  residualRisk: string; // Rủi ro còn lại (Cao / Trung bình / Thấp)

  @Column({ type: 'text', nullable: true })
  recommendationText: string; // Kiến nghị của KTV

  @Column({ type: 'text', nullable: true })
  relatedPersonnelText: string; // Nhân sự liên quan tổng hợp

  @Column({ nullable: true })
  violationHistory: string; // Lịch sử/tính chất vi phạm (Lần đầu / Lặp lại / Hệ thống)

  @Column({ nullable: true })
  responsibleDepartment: string; // Trách nhiệm thực hiện (phòng/ban)

  @Column({ nullable: true })
  deadline: string; // Thời hạn thực hiện

  @Column({ nullable: true })
  primaryOfficerUnit: string; // Trách nhiệm chính (ĐVKD)

  @Column({ nullable: true })
  relatedOfficer1Unit: string; // Trách nhiệm liên quan 1 (ĐVKD)

  @Column({ nullable: true })
  relatedOfficer2Unit: string; // Trách nhiệm liên quan 2 (ĐVKD)

  @Column({ nullable: true })
  relatedOfficer3Unit: string; // Trách nhiệm liên quan 3 (ĐVKD)

  @Column({ nullable: true })
  primaryOfficerHO: string; // Trách nhiệm chính (Hội sở)

  @Column({ nullable: true })
  relatedOfficer1HO: string; // Trách nhiệm liên quan 1 (Hội sở)

  @Column({ nullable: true })
  relatedOfficer2HO: string; // Trách nhiệm liên quan 2 (Hội sở)

  @Column({ nullable: true })
  auditeeOpinion: string; // Ý kiến của Đơn vị (Đồng ý / Không đồng ý)

  @Column({ default: true })
  includeInReport: boolean; // Lên báo cáo phát hành (true / false)

  // ═══ PTD & REMEDIATION (20 COLUMNS) EXTENDED FIELDS ═══

  @Column({ nullable: true })
  errorCountText: string; // Số lượng sai sót (vd: 5/17 tháng, 122 giao dịch)

  @Column({ nullable: true })
  branchDirectorAtViolation: string; // Họ tên Giám đốc tại thời điểm sai phạm

  @Column({ default: true })
  remediationFeasibility: boolean; // Đánh giá khả năng tiếp tục khắc phục (Có/Không)

  @Column({ type: 'text', nullable: true })
  remediationUnfeasibleReason: string; // Nguyên nhân (Nếu không khắc phục được)

  @Column({ type: 'text', nullable: true })
  auditeeProposal: string; // Đề xuất của Đơn vị được kiểm toán

  @Column({ nullable: true })
  remediationApprover: string; // Cán bộ phê duyệt khắc phục

  @Column({ nullable: true })
  remediationApprovedDate: string; // Ngày phê duyệt khắc phục

  @Column({ nullable: true })
  monitoringCycle: string; // Kỳ theo dõi (theo tháng)

  @Column({ nullable: true })
  remediationEvidenceLink: string; // Link scan chứng từ khắc phục

  // ═══ CÁC BẢNG KÊ CHUYÊN SÂU (29 BẢNG KÊ PTD & PGDBĐ) ═══

  @Column({ nullable: true })
  postalAgencyCode: string; // Mã bưu cục / Điểm BPGDBĐ / BĐX

  @Column({ type: 'float', nullable: true })
  reconciliationCashDiff: number; // Số tiền chênh lệch nộp tiền mặt (BPGDBĐ -> BĐX -> LPBank)

  @Column({ type: 'int', nullable: true })
  reportDelayDays: number; // Số ngày in/phê duyệt báo cáo chậm (Báo cáo TK5.1...)

  @Column({ nullable: true })
  userCrossEnv: string; // Phân quyền user chéo môi trường Core Banking

  @Column({ type: 'int', nullable: true })
  uniVsT24DiffMinutes: number; // Chênh lệch phút giờ duyệt Uni vs T24

  @Column({ nullable: true })
  damagedAcqtSeries: string; // Số seri ACQT / Phôi chứng từ báo hỏng

  @Column({ type: 'float', nullable: true })
  negativeAccountBalance: number; // Số dư tài khoản âm

  // ═══ Dynamic Sample Data ═══

  @Column({ type: 'json', nullable: true })
  sampleData: any; // Dynamic fields

  @Column({ type: 'json', nullable: true })
  sampleAssessments: any; // Checklist assessment data

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
