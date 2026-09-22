import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('review_actions')
export class ReviewAction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  entityType: string; // WorkingPaper | Finding | Engagement

  @Column()
  entityId: number;

  @Column()
  action: string; // SelfReview | SupervisorApprove | SupervisorReject | IndependentApprove | IndependentReject | Comment | SignOff

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: number;

  @Column({ nullable: true })
  userName: string; // ponytail: denormalized for fast display without join

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
