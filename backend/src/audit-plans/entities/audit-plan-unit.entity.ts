import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AuditPlan } from './audit-plan.entity';
import { AuditUniverse } from '../../audit-universe/entities/audit-universe.entity';
import { RiskAssessment } from '../../risk-assessments/entities/risk-assessment.entity';

/**
 * AuditPlanUnit — Normalized relation replacing the JSON blob `selectedUnits` in AuditPlan.
 * Quan hệ dòng kế hoạch - Audit Universe - Assessment đã phê duyệt (RBIA / GIAS 9.4).
 */
@Entity('audit_plan_units')
export class AuditPlanUnit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  planId: number;

  @ManyToOne(() => AuditPlan, (plan) => plan.planUnits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'planId' })
  plan: AuditPlan;

  @ManyToOne(() => AuditUniverse, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'universeId' })
  universe: AuditUniverse;

  @Column({ nullable: true })
  universeId: number;

  @ManyToOne(() => RiskAssessment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assessmentId' })
  assessment: RiskAssessment;

  @Column({ nullable: true })
  assessmentId: number;

  @Column({ nullable: true })
  universeName: string;

  @Column({ nullable: true })
  riskLevel: string;

  @Column({ type: 'text', nullable: true })
  justification: string;

  @Column({ type: 'float', nullable: true })
  estDays: number;

  @Column({ nullable: true })
  ktvCount: number;

  @Column({ nullable: true })
  scheduledMonth: number;

  @Column({ nullable: true })
  targetQuarter: string;

  @Column({ nullable: true })
  leadAuditorId: number;

  @Column({ nullable: true })
  leadAuditorName: string;

  @Column({ type: 'simple-json', nullable: true })
  assignedTeamMembers: any;

  @Column({ nullable: true })
  auditCategory: string;

  @Column({ nullable: true })
  totalScore: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
