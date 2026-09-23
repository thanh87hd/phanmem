import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { RiskAssessment } from './risk-assessment.entity';
import { RiskCriterion } from '../../risk-criteria/entities/risk-criterion.entity';

@Index(['assessmentId', 'criterionId'])
@Entity('risk_assessment_scores')
export class RiskAssessmentScore {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => RiskAssessment, (assessment) => assessment.scores, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'assessmentId' })
  assessment: RiskAssessment;

  @Index()
  @Column()
  assessmentId: number;

  @ManyToOne(() => RiskCriterion, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'criterionId' })
  criterion: RiskCriterion;

  @Column({ nullable: true })
  criterionId: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  criterionName: string;

  @Column({ type: 'float', default: 0 })
  weight: number; // Tỷ trọng tiêu chí (0 - 100%)

  @Column({ type: 'float', default: 3 })
  score: number; // Điểm 1 - 5

  @Column({ type: 'float', default: 0 })
  weightedScore: number; // score * (weight / 100)

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
