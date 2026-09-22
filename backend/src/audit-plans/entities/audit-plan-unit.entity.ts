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

/**
 * AuditPlanUnit — Normalized relation replacing the JSON blob `selectedUnits` in AuditPlan.
 * Each row represents one audit universe selected for a specific audit plan.
 * Aligns with GIAS 9.4 (Dynamic Plan) requiring queryable, auditable plan units.
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

  @Column({ nullable: true })
  universeId: number;

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
