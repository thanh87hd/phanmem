import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RiskAssessment } from './risk-assessment.entity';
import { User } from '../../users/entities/user.entity';

@Entity('risk_audit_log')
export class RiskAuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  entity: string; // e.g., 'risk_assessment', 'risk_weight', etc.

  @Column({ type: 'int' })
  entityId: number;

  @Column({ type: 'varchar', length: 30 })
  action: string; // e.g., 'create', 'update', 'approve', 'reject', 'export'

  @Column({ type: 'int', nullable: true })
  performedById?: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'performedById' })
  performedBy?: User;

  @Column({ type: 'json', nullable: true })
  metadata?: any; // optional extra data like before/after values

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
