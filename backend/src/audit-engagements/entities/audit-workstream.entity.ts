import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { AuditEngagement } from './audit-engagement.entity';
import { User } from '../../users/entities/user.entity';
import { AuditReviewNote } from '../../working-papers/entities/audit-review-note.entity';

@Entity('audit_workstreams')
export class AuditWorkstream {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => AuditEngagement, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'engagementId' })
  engagement: AuditEngagement;

  @Column()
  engagementId: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  scope: string;

  @Column({ nullable: true })
  riskArea: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignedAuditorId' })
  assignedAuditorUser: User;

  @Column({ nullable: true })
  assignedAuditorId: number;

  @Column({ nullable: true })
  assignedAuditorName: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewerId' })
  reviewerUser: User;

  @Column({ nullable: true })
  reviewerId: number;

  @Column({ nullable: true })
  reviewerName: string;

  @Column({ default: 'Draft' })
  status: string; // Draft | InProgress | Completed | Reviewed | Rework

  @Column({ type: 'date', nullable: true })
  startDate: string; // Ngày bắt đầu phân hành

  @Column({ type: 'date', nullable: true })
  dueDate: string; // Hạn hoàn thành phân hành

  @Column({ type: 'int', nullable: true })
  estimatedDays: number; // Ngày công dự kiến

  @Column({ default: 'Medium' })
  priority: string; // High | Medium | Low

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column({ type: 'text', nullable: true })
  reviewNotes: string;

  @OneToMany(() => AuditReviewNote, (note) => note.workstream)
  reviewNotesList: AuditReviewNote[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
