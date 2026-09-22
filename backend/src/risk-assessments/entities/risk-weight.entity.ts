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

@Entity('risk_weights')
export class RiskWeight {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  assessmentId: number;

  @ManyToOne(() => RiskAssessment, (ra) => ra.weights, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assessmentId' })
  assessment: RiskAssessment;

  @Column({ type: 'varchar', length: 100 })
  criteriaId: string; // Identifier for the criteria

  @Column({ type: 'float' })
  weight: number; // Weight value used in scoring

  @Column({ type: 'varchar', nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Optional audit fields
  @Column({ nullable: true })
  createdById?: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy?: User;
}
