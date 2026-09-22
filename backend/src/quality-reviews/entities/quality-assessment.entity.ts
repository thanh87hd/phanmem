import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('quality_assessments')
export class QualityAssessment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  engagementId: number;

  @Column()
  engagementName: string;

  @Column({ nullable: true })
  assessorName: string;

  @Column({ type: 'date', nullable: true })
  assessmentDate: string;

  @Column({ type: 'simple-json', nullable: true })
  criteriaScores: {
    planning: number;
    execution: number;
    reporting: number;
    documentation: number;
  };

  @Column({ type: 'simple-json', nullable: true })
  criteriaComments: {
    planning: string;
    execution: string;
    reporting: string;
    documentation: string;
  };

  @Column({ type: 'float', default: 0 })
  overallScore: number;

  @Column({ default: 'Good' })
  rating: string; // Excellent | Good | Needs Improvement | Unsatisfactory

  @Column({ type: 'text', nullable: true })
  generalComment: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
