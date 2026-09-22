import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AuditUniverse } from '../../audit-universe/entities/audit-universe.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Risk Register — Quản lý rủi ro cấp quy trình con (sub-process level).
 *
 * Mapping từ THUCTE Bo_phuong_phap_luan Sheet 05_Risk_Register:
 * - risk_id → id (PK)
 * - audit_object_id → auditObjectId (FK → Universe)
 * - risk_category → riskCategory
 * - design_effectiveness → designEffectiveness (0/0.5/1)
 * - operating_effectiveness → operatingEffectiveness (0/0.5/1)
 *
 * Cũng mapping từ HSRR_TONG_HOP_KTNB_2026.xlsx (16 cột):
 * - Mã_HSRR → hsrrCode
 * - Lĩnh_vực → domain
 * - Nhóm_rủi_ro → riskGroup
 */
@Index(['auditObjectId', 'domain'])
@Index(['hsrrCode'])
@Entity('risk_registers')
export class RiskRegister {
  @PrimaryGeneratedColumn()
  id: number;

  // FK → Audit Universe (đối tượng kiểm toán cha)
  @ManyToOne(() => AuditUniverse, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'auditObjectId' })
  auditObject: AuditUniverse;

  @Column({ type: 'int', nullable: true })
  auditObjectId: number;

  // ==================== Định danh HSRR ====================

  @Column({ nullable: true })
  hsrrCode: string; // Mã HSRR: HS01_HSRR_CNTT, HS08_HSRR_PGDBD...

  @Column({ nullable: true })
  domain: string; // Lĩnh vực: CNTT, Thanh toán, QTRR, Vận hành, NS, VPQT, TD_CLTD, PGDBD, PTD_DVKD, TD_DVKD, NHDN, NHBL

  @Column({ nullable: true })
  sequenceNo: string; // STT trong lĩnh vực (1, 1.1, 2...)

  // ==================== Phân loại rủi ro ====================

  @Column()
  riskCategory: string; // Nhóm rủi ro: Rủi ro Hạ tầng CNTT, Rủi ro An ninh mạng...

  @Column()
  riskTitle: string; // Tên rủi ro cụ thể

  @Column({ type: 'text', nullable: true })
  riskDescription: string; // Mô tả chi tiết rủi ro

  // ==================== Đánh giá ảnh hưởng & khả năng ====================

  @Column({ type: 'text', nullable: true })
  impactAssessment: string; // Đánh giá ảnh hưởng (mô tả dạng text theo HSRR)

  @Column({ type: 'text', nullable: true })
  likelihoodAssessment: string; // Đánh giá khả năng xảy ra

  @Column({ type: 'float', nullable: true })
  impactScore: number; // Điểm ảnh hưởng 1-5

  @Column({ type: 'float', nullable: true })
  likelihoodScore: number; // Điểm khả năng 1-5

  @Column({ type: 'float', nullable: true })
  inherentRiskScore: number; // Điểm rủi ro tiềm ẩn (computed)

  @Column({ nullable: true })
  inherentRiskLevel: string; // Cao | Trung bình | Thấp

  // ==================== Kiểm soát ====================

  @Column({ type: 'text', nullable: true })
  controlObjective: string; // Mục tiêu kiểm soát

  @Column({ type: 'text', nullable: true })
  controlMeasures: string; // Biện pháp kiểm soát hiện hành

  @Column({ type: 'text', nullable: true })
  controlCriteria: string; // Tiêu chí đánh giá kiểm soát (mô tả chi tiết từ HSRR)

  // Design: 0 (Không hiệu lực) | 0.5 (Một phần) | 1 (Hiệu lực)
  @Column({ type: 'float', nullable: true })
  designEffectiveness: number;

  // Operating: 0 (Không hiệu lực) | 0.5 (Một phần) | 1 (Hiệu lực)
  @Column({ type: 'float', nullable: true })
  operatingEffectiveness: number;

  @Column({ nullable: true })
  controlRating: string; // Tốt | Trung bình | Yếu

  // ==================== Rủi ro còn lại ====================

  @Column({ type: 'float', nullable: true })
  residualLikelihood: number; // Khả năng xảy ra sau kiểm soát

  @Column({ type: 'float', nullable: true })
  residualImpact: number; // Ảnh hưởng sau kiểm soát

  @Column({ type: 'float', nullable: true })
  residualRiskScore: number; // Điểm rủi ro còn lại (computed)

  @Column({ nullable: true })
  finalRiskBand: string; // Cao | Trung bình | Thấp

  // ==================== Phản hồi & hành động ====================

  @Column({ nullable: true })
  riskResponse: string; // Accept | Mitigate | Avoid | Transfer

  @Column({ type: 'text', nullable: true })
  actionPlan: string; // Kế hoạch hành động

  @Column({ type: 'date', nullable: true })
  targetDate: string; // Ngày mục tiêu hoàn thành

  // ==================== Trách nhiệm ====================

  @Column({ nullable: true })
  responsibleUnit: string; // Đơn vị chịu trách nhiệm (Hội sở / Phòng CNTT...)

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'riskOwnerId' })
  riskOwner: User;

  @Column({ nullable: true })
  riskOwnerId: number;

  @Column({ nullable: true })
  riskOwnerName: string; // Denormalized

  // ==================== Liên kết ====================

  @Column({ type: 'simple-json', nullable: true })
  relatedIssueIds: number[]; // FK → audit_findings (Issue Library)

  @Column({ type: 'simple-json', nullable: true })
  relatedRcmIds: number[]; // FK → risk_control_matrix

  // ==================== Metadata ====================

  @Column({ default: 'Active' })
  status: string; // Active | Archived | UnderReview

  @Column({ type: 'int', nullable: true })
  assessmentYear: number; // Năm đánh giá

  @Column({ type: 'jsonb', nullable: true })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
