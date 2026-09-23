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
import { RiskProfile } from '../../risk-assessments/entities/risk-profile.entity';
import { RiskControlMatrix } from '../../risk-control-matrix/entities/risk-control-matrix.entity';

/**
 * Risk Register — Quản lý hồ sơ rủi ro thực tế của một Audit Universe trong chu kỳ đánh giá RBIA.
 * Tham chiếu RiskProfile (HSRR chuẩn) và RiskControlMatrix (RCM).
 */
@Index(['auditUniverseId', 'assessmentYear'])
@Index(['riskProfileId'])
@Entity('risk_registers')
export class RiskRegister {
  @PrimaryGeneratedColumn()
  id: number;

  // FK → Audit Universe (bắt buộc theo RBIA)
  @ManyToOne(() => AuditUniverse, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auditUniverseId' })
  auditUniverse: AuditUniverse;

  @Index()
  @Column({ type: 'int', nullable: true })
  auditUniverseId: number;

  // Backward-compatible alias
  @Column({ type: 'int', nullable: true })
  auditObjectId: number;

  // FK → Risk Profile (HSRR chuẩn - bắt buộc theo RBIA)
  @ManyToOne(() => RiskProfile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'riskProfileId' })
  riskProfile: RiskProfile;

  @Index()
  @Column({ type: 'int', nullable: true })
  riskProfileId: number;

  // FK → Risk Control Matrix (RCM - tùy chọn)
  @ManyToOne(() => RiskControlMatrix, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'riskControlMatrixId' })
  riskControlMatrix: RiskControlMatrix;

  @Index()
  @Column({ type: 'int', nullable: true })
  riskControlMatrixId: number;

  @Index()
  @Column({ type: 'int', default: 2026 })
  assessmentYear: number;

  @Column({ type: 'text', nullable: true })
  contextDescription: string; // Bối cảnh, mô tả rủi ro thực tế tại đơn vị trong kỳ

  // ==================== Định danh HSRR (legacy/fallback) ====================

  @Column({ nullable: true })
  hsrrCode: string;

  @Column({ nullable: true })
  domain: string;

  @Column({ nullable: true })
  sequenceNo: string;

  // ==================== Phân loại rủi ro (legacy/fallback) ====================

  @Column({ nullable: true })
  riskCategory: string;

  @Column({ nullable: true })
  riskTitle: string;

  @Column({ type: 'text', nullable: true })
  riskDescription: string;

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

  @Column({ type: 'jsonb', nullable: true })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
