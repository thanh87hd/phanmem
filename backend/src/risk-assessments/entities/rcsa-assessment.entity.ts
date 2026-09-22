import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditUniverse } from '../../audit-universe/entities/audit-universe.entity';

@Entity('rcsa_assessments')
export class RcsaAssessment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  departmentName: string; // Tên chi nhánh / phòng ban tự đánh giá (Tuyến 1)

  // FK → Audit Universe: liên kết chặt với đối tượng kiểm toán
  @ManyToOne(() => AuditUniverse, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'auditUniverseId' })
  auditUniverse: AuditUniverse;

  @Column({ type: 'int', nullable: true })
  auditUniverseId: number;

  @Column()
  processName: string; // Tên quy trình nghiệp vụ (Giải ngân, Huy động, Kho quỹ...)

  @Column()
  riskDescription: string; // Mô tả rủi ro tiềm ẩn

  @Column()
  controlName: string; // Tên chốt kiểm soát hiện tại (Duyệt 2 cấp, Xác thực sinh trắc...)

  @Column({ default: 'Effective' })
  controlEffectiveness: string; // Effective | Partially Effective | Ineffective

  @Column({ type: 'int', default: 3 })
  inherentRisk: number; // Rủi ro tiềm ẩn (1 - 5)

  @Column({ type: 'int', default: 2 })
  residualRisk: number; // Rủi ro còn lại (1 - 5)

  @Column({ default: 'Completed' })
  status: string; // Draft | InProgress | Completed | Submitted | Approved | Rejected

  @Column({ type: 'text', nullable: true })
  actionPlan: string; // Kế hoạch hành động giảm thiểu rủi ro

  @Column()
  assessedByUsername: string; // Người tự đánh giá ở Tuyến 1

  @Column({ nullable: true })
  reviewedBy: string; // Người phê duyệt (Tuyến 2/3)

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column({ type: 'text', nullable: true })
  reviewNotes: string;

  @Column({ default: new Date().getFullYear() })
  assessmentYear: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
