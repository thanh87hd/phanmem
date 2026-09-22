import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('quality_reviews')
export class QualityReview {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  workingPaperId: number;

  @Column()
  workingPaperTitle: string;

  // --- Self Review (Cấp 1: KTV tự soát xét) ---
  @Column({ default: 'Pending' })
  selfReviewStatus: string; // Pending | Completed

  @Column({ nullable: true })
  selfReviewNotes: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'selfReviewerId' })
  selfReviewer: User;

  @Column({ nullable: true })
  selfReviewerId: number;

  @Column({ type: 'timestamp', nullable: true })
  selfReviewedAt: Date;

  // --- Supervisor Review (Cấp 2: Trưởng đoàn / Audit Manager) ---
  @Column({ default: 'Pending' })
  supervisorReviewStatus: string; // Pending | Approved | Rejected

  @Column({ nullable: true })
  supervisorReviewNotes: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supervisorReviewerId' })
  supervisorReviewer: User;

  @Column({ nullable: true })
  supervisorReviewerId: number;

  @Column({ type: 'timestamp', nullable: true })
  supervisorReviewedAt: Date;

  // --- Independent Review (Cấp 3: Trưởng Ban KTNB / CAE) ---
  @Column({ default: 'Pending' })
  independentReviewStatus: string; // Pending | Approved | Rejected

  @Column({ nullable: true })
  independentReviewNotes: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'independentReviewerId' })
  independentReviewer: User;

  @Column({ nullable: true })
  independentReviewerId: number;

  @Column({ type: 'timestamp', nullable: true })
  independentReviewedAt: Date;

  // --- Checklist & Overall ---
  @Column({ type: 'simple-json', nullable: true })
  checklist: { key: string; label: string; checked: boolean }[];

  @Column({ default: 'Draft' })
  overallStatus: string; // Draft | InReview | Approved | Rejected

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
