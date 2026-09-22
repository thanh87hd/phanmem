import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditEngagement } from './audit-engagement.entity';
import { User } from '../../users/entities/user.entity';

@Entity('engagement_change_requests')
export class EngagementChangeRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => AuditEngagement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'engagementId' })
  engagement: AuditEngagement;

  @Column()
  engagementId: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  @Column({ nullable: true })
  requesterId: number;

  @Column({ nullable: true })
  requesterName: string;

  @Column({ type: 'simple-json' })
  requestedChanges: any; // Lưu trữ cấu trúc JSON về thời gian, nhân sự, phạm vi

  @Column({ type: 'text' })
  reason: string; // Lý do thay đổi đột xuất

  @Column({ default: 'Pending' })
  status: string; // Pending | Approved | Rejected

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewerId' })
  reviewer: User;

  @Column({ nullable: true })
  reviewerId: number;

  @Column({ nullable: true })
  reviewerName: string;

  @Column({ type: 'text', nullable: true })
  reviewNotes: string; // Lý do từ chối nếu có

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
