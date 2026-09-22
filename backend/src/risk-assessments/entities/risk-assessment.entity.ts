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
import { AuditUniverse } from '../../audit-universe/entities/audit-universe.entity';
import { Department } from '../../departments/entities/department.entity';
import { User } from '../../users/entities/user.entity';
import { RiskWeight } from './risk-weight.entity';
import { RiskApproval } from './risk-approval.entity';
import { RiskSnapshot } from './risk-snapshot.entity';
import {
  CriterionScoringItem,
  ImpactScoringItem,
  LikelihoodScoringItem,
} from '../unified-risk-engine.service';

@Entity('risk_assessments')
export class RiskAssessment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'universeName', nullable: true })
  legacyUniverseName: string;

  // FK → Audit Universe: liên kết chặt với đối tượng kiểm toán
  @ManyToOne(() => AuditUniverse, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'auditUniverseId' })
  auditUniverse: AuditUniverse;

  @Column({ type: 'int', nullable: true })
  auditUniverseId: number;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'departmentId' })
  department: Department;

  @Column({ nullable: true })
  departmentId: number;

  @Column({ name: 'department', nullable: true })
  legacyDepartmentName: string; // Đơn vị/Bộ phận chịu trách nhiệm

  // ==================== Phân nhóm kiểm toán (IIA 2024 Hybrid Approach) ====================

  @Column({ default: 'ChiNhanh' })
  auditCategory: string; // HoiSo | ChiNhanh | PGD | HeThong | ChuyenDe

  // ==================== Risk Scoring (IIA 2024 / Basel BCBS) ====================
  @Column({ type: 'float', nullable: true, default: 0 })
  totalScore: number; // Điểm rủi ro tổng hợp (backward-compatible)

  // Chi tiết chấm điểm từng tiêu chí rủi ro (JSONB)
  // Format: [{ criteriaId, criteriaName, weight, score, weightedScore }]
  @Column({ type: 'simple-json', nullable: true })
  criteriaScores: CriterionScoringItem[] | null;

  @Column({ type: 'int', default: 3 })
  impact: number; // 1-5 (Ảnh hưởng)

  @Column({ type: 'int', default: 3 })
  likelihood: number; // 1-5 (Khả năng xảy ra)

  // ==================== Inherent → Control → Residual Risk (Basel/BCBS + THUCTE Scoring Model) ====================

  @Column({ type: 'float', default: 0 })
  inherentRiskScore: number; // Điểm rủi ro tiềm ẩn = totalScore (trước khi xét kiểm soát)

  @Column({ default: 'Adequate' })
  controlEffectiveness: string; // Strong | Adequate | Weak | Ineffective (backward-compatible)

  // Chi tiết Design/Operating Effectiveness theo THUCTE 10_Scoring_Model
  // Design: 0 (Không hiệu lực) | 0.5 (Một phần) | 1 (Hiệu lực) — Trọng số 40%
  @Column({ type: 'float', nullable: true })
  designEffectiveness: number;

  // Operating: 0 (Không hiệu lực) | 0.5 (Một phần) | 1 (Hiệu lực) — Trọng số 60%
  @Column({ type: 'float', nullable: true })
  operatingEffectiveness: number;

  // Chi tiết chấm điểm Impact (5 thành phần) theo THUCTE Scoring Model
  // Format: [{ component: 'Tài chính', weight: 0.25, score: 1-5 }, ...]
  @Column({ type: 'simple-json', nullable: true })
  impactScores: ImpactScoringItem[] | null;

  // Chi tiết chấm điểm Likelihood (4 thành phần)
  // Format: [{ component: 'Tần suất/phơi nhiễm', weight: 0.35, score: 1-5 }, ...]
  @Column({ type: 'simple-json', nullable: true })
  likelihoodScores: LikelihoodScoringItem[] | null;

  @Column({ type: 'float', default: 0 })
  residualRiskScore: number; // Điểm rủi ro còn lại = inherentRisk × (1 - CE)

  // Adjusted Residual = Residual × Modifiers (capped at max)
  @Column({ type: 'float', nullable: true })
  adjustedResidualScore: number;

  // ==================== Risk Modifiers (THUCTE Scoring Model) ====================

  @Column({ default: false })
  isRecurring: boolean; // Modifier ×1.2 — Issue thực sự tái diễn

  @Column({ default: false })
  isOverdueCritical: boolean; // Modifier ×1.15 — Action High/Critical quá hạn

  @Column({ default: false })
  isEmergingRisk: boolean; // Modifier ×1.1 — Có bằng chứng xu hướng/thay đổi

  @Column({ type: 'float', nullable: true })
  modifierScore: number; // Tổng hợp modifier (tích các modifier áp dụng)

  @Column({ type: 'float', nullable: true, default: 0 })
  totalWeight: number; // Tổng trọng số từ bảng risk_weights (phải = 1.0)

  @Column({ default: 'Stable' })
  riskVelocity: string; // Increasing | Stable | Decreasing — Tốc độ biến động rủi ro (IIA 2024)

  @Column({ nullable: true })
  riskAppetite: string; // Accept | Mitigate | Avoid | Transfer — Khẩu vị rủi ro

  // ==================== Audit Planning Integration ====================

  @Column({ default: 'Annual' })
  auditFrequency: string; // Annual | Biennial | Triennial | AdHoc — Tần suất đề xuất

  @Column({ type: 'date', nullable: true })
  lastAuditDate: string; // Ngày kiểm toán gần nhất

  @Column()
  riskLevel: string; // Hạng 1 (Tốt) → Hạng 5 (Kém) hoặc High/Medium/Low

  @Column()
  assessmentYear: number;

  // ==================== Workflow phê duyệt ====================

  @Column({ default: 'Draft' })
  status: string; // Draft | Submitted | Approved | Rejected

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assessedById' })
  assessedBy: User;

  @Column({ nullable: true })
  assessedById: number;

  @Column({ name: 'assessedBy', nullable: true })
  legacyAssessedByUserId: number;

  // New relation: multiple risk weights
  @OneToMany(() => RiskWeight, (weight) => weight.assessment, { cascade: true })
  weights: RiskWeight[];

  @Column({ name: 'assessedByName', nullable: true })
  legacyAssessedByName: string; // Tên người đánh giá (denormalized)

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewedById' })
  reviewedBy: User;
  @OneToMany(() => RiskApproval, (approval) => approval.assessment, {
    cascade: true,
  })
  approvals: RiskApproval[];
  @OneToMany(() => RiskSnapshot, (snapshot) => snapshot.assessment, {
    cascade: true,
  })
  snapshots: RiskSnapshot[];

  @Column({ nullable: true })
  reviewedById: number;

  @Column({ name: 'reviewedBy', nullable: true })
  legacyReviewedByUserId: number;

  @Column({ name: 'reviewedByName', nullable: true })
  legacyReviewedByName: string; // Tên người phê duyệt (denormalized)

  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date; // Ngày gửi duyệt

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date; // Ngày phê duyệt / từ chối

  @Column({ type: 'text', nullable: true })
  reviewNotes: string; // Ghi chú phê duyệt / lý do từ chối

  // ==================== Thông tin bổ sung ====================

  @Column({ type: 'text', nullable: true })
  notes: string; // Ghi chú đánh giá

  @Column({ type: 'text', nullable: true })
  mitigationPlan: string; // Kế hoạch giảm thiểu rủi ro

  @Column({ type: 'text', nullable: true })
  riskDescription: string; // Mô tả rủi ro chính

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
