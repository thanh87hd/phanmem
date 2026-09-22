import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RiskAssessment } from './risk-assessment.entity';
import { User } from '../../users/entities/user.entity';

@Entity('risk_approvals')
export class RiskApproval {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  assessmentId: number;

  @ManyToOne(() => RiskAssessment, (ra) => ra.approvals, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'assessmentId' })
  assessment: RiskAssessment;

  @Column({ type: 'int' })
  approverId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approverId' })
  approver?: User;

  @Column({ type: 'int' })
  level: number; // approval level (e.g., 1 = team lead, 2 = manager, etc.)

  @Column({ type: 'varchar', length: 20, default: 'Pending' })
  status: string; // Pending | Approved | Rejected

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
