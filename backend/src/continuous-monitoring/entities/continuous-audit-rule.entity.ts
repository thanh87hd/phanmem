import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('continuous_audit_rules')
export class ContinuousAuditRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  ruleId: string;

  @Column({ nullable: true })
  tier: string;

  @Column({ nullable: true })
  domain: string;

  @Column({ type: 'text', nullable: true })
  ruleName: string;

  @Column({ type: 'text', nullable: true })
  auditObjective: string;

  @Column({ type: 'text', nullable: true })
  risk: string;

  @Column({ type: 'text', nullable: true })
  expectedControl: string;

  @Column({ type: 'text', nullable: true })
  population: string;

  @Column({ type: 'text', nullable: true })
  logic: string;

  @Column({ type: 'text', nullable: true })
  minimumData: string;

  @Column({ nullable: true })
  sourceSystem: string;

  @Column({ nullable: true })
  frequency: string;

  @Column({ nullable: true })
  alertLevel: string;

  @Column({ nullable: true })
  slaHours: number;

  @Column({ type: 'text', nullable: true })
  ownerL1: string;

  @Column({ type: 'text', nullable: true })
  ownerL2: string;

  @Column({ type: 'text', nullable: true })
  ownerL3: string;

  @Column({ type: 'text', nullable: true })
  evidenceRequired: string;

  @Column({ type: 'text', nullable: true })
  falsePositiveExclusion: string;

  @Column({ type: 'text', nullable: true })
  requiredAction: string;

  @Column({ type: 'text', nullable: true })
  uatCriteria: string;

  @Column({ type: 'int', nullable: true })
  impact: number;

  @Column({ type: 'int', nullable: true })
  likelihood: number;

  @Column({ type: 'int', nullable: true })
  dataReadiness: number;

  @Column({ type: 'int', nullable: true })
  auditValue: number;

  @Column({ type: 'int', nullable: true })
  priorityScore: number;

  @Column({ nullable: true })
  priorityGroup: string;

  @Column({ nullable: true })
  version: string;

  @Column({ nullable: true })
  status: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
