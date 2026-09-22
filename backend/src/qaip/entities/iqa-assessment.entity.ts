import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AuditEngagement } from '../../audit-engagements/entities/audit-engagement.entity';

@Entity('iqa_assessments')
export class IqaAssessment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string; // VD: "Đánh giá Chất lượng Nội bộ Q2/2026"

  @Column({ type: 'int' })
  assessmentYear: number;

  @Column({ nullable: true })
  assessmentPeriod: string; // Q1 | Q2 | Q3 | Q4 | Annual

  // FK → Cuộc kiểm toán được đánh giá (tuỳ chọn)
  @ManyToOne(() => AuditEngagement, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'engagementId' })
  engagement: AuditEngagement;

  @Column({ nullable: true })
  engagementId: number;

  @Column({ nullable: true })
  engagementName: string; // Denormalized

  // Người đánh giá (Audit Manager / Senior Auditor khác)
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assessorId' })
  assessor: User;

  @Column({ nullable: true })
  assessorId: number;

  @Column({ nullable: true })
  assessorName: string;

  // Tiêu chí đánh giá chất lượng
  @Column({ type: 'jsonb', nullable: true })
  criteria: {
    criterionId: string;
    criterionName: string;
    maxScore: number;
    actualScore: number;
    notes: string;
  }[];

  @Column({ type: 'float', nullable: true })
  overallScore: number; // Tổng điểm chất lượng (0-100)

  @Column({ default: 'Generally Conforms' })
  conformityLevel: string; // Generally Conforms | Partially Conforms | Does Not Conform

  // Kết quả đánh giá
  @Column({ type: 'text', nullable: true })
  strengths: string; // Điểm mạnh

  @Column({ type: 'text', nullable: true })
  areasForImprovement: string; // Điểm cần cải thiện

  @Column({ type: 'jsonb', nullable: true })
  actionItems: {
    item: string;
    assignee: string;
    dueDate: string;
    status: 'Open' | 'InProgress' | 'Completed';
  }[];

  // KPI metrics
  @Column({ type: 'float', nullable: true })
  wpFirstTimeApprovalRate: number; // % WP approved lần đầu

  @Column({ type: 'float', nullable: true })
  avgReworkCount: number; // Số lần rework trung bình

  @Column({ type: 'float', nullable: true })
  budgetVariance: number; // % chênh lệch budget vs actual

  @Column({ type: 'float', nullable: true })
  timelinessRate: number; // % hoàn thành đúng hạn

  @Column({ default: 'Draft' })
  status: string; // Draft | Submitted | Approved

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
