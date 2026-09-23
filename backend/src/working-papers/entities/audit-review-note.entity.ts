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
import { WorkingPaper } from './working-paper.entity';
import { AuditWorkstream } from '../../audit-engagements/entities/audit-workstream.entity';
import { AuditEngagement } from '../../audit-engagements/entities/audit-engagement.entity';
import { User } from '../../users/entities/user.entity';

export enum ReviewNoteStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

@Entity('audit_review_notes')
@Index(['engagementId', 'status'])
@Index(['workingPaperId', 'status'])
@Index(['workstreamId', 'status'])
export class AuditReviewNote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  reviewSeq?: string | null; // e.g. RN-01, RN-02...

  @ManyToOne(() => AuditEngagement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'engagementId' })
  engagement: AuditEngagement;

  @Column({ type: 'int' })
  engagementId: number;

  @ManyToOne(() => WorkingPaper, (wp) => wp.reviewNoteItems, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workingPaperId' })
  workingPaper: WorkingPaper;

  @Column({ type: 'int', nullable: true })
  workingPaperId?: number | null;

  @ManyToOne(() => AuditWorkstream, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workstreamId' })
  workstream: AuditWorkstream;

  @Column({ type: 'int', nullable: true })
  workstreamId?: number | null;

  // Reviewer tạo điểm soát xét
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewerId' })
  reviewer: User;

  @Column({ type: 'int', nullable: true })
  reviewerId?: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reviewerName?: string | null;

  // Nội dung ghi chú soát xét (bắt buộc)
  @Column({ type: 'text' })
  note: string;

  // Auditor giải trình / phản hồi
  @Column({ type: 'text', nullable: true })
  auditorResponse?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'auditorId' })
  auditor: User;

  @Column({ type: 'int', nullable: true })
  auditorId?: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  auditorName?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  responseAt?: Date | null;

  // Trạng thái: OPEN -> RESOLVED -> CLOSED
  @Column({
    type: 'enum',
    enum: ReviewNoteStatus,
    default: ReviewNoteStatus.OPEN,
  })
  status: ReviewNoteStatus;

  @Column({ type: 'timestamp', nullable: true })
  closedAt?: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'closedById' })
  closedBy: User;

  @Column({ type: 'int', nullable: true })
  closedById?: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
