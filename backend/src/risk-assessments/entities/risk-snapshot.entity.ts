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

@Entity('risk_snapshots')
export class RiskSnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  assessmentId: number;

  @ManyToOne(() => RiskAssessment, (ra) => ra.snapshots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'assessmentId' })
  assessment: RiskAssessment;

  @Column({ type: 'jsonb' })
  data: any; // Full JSON snapshot of the assessment at a point in time

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  createdById?: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy?: User;
}
