import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MonitoringAlert } from './monitoring-alert.entity';

@Entity('audit_cases')
export class AuditCase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  caseId: string; // CASE-XXXXXXXX

  @Column()
  alertId: number;

  @ManyToOne(() => MonitoringAlert, { nullable: true })
  @JoinColumn({ name: 'alertId' })
  alert: MonitoringAlert;

  @Column({ nullable: true })
  branchCode: string;

  @Column({ nullable: true })
  assignedAuditor: string;

  @Column({ type: 'int', default: 90 })
  riskScore: number;

  /** PENDING_EXPLANATION | EXPLAINED | REJECTED | APPROVED */
  @Column({ default: 'PENDING_EXPLANATION' })
  explanationStatus: string;

  @Column({ type: 'text', nullable: true })
  explanationText: string;

  @Column({ type: 'text', nullable: true })
  rootCauseAnalysis: string;

  @Column({ type: 'text', nullable: true })
  actionPlan: string;

  @Column({ type: 'text', nullable: true })
  auditActionRequired: string;

  @Column({ type: 'text', nullable: true })
  auditorVerdict: string;

  @Column({ type: 'timestamp', nullable: true })
  slaDeadline: Date;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
