import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: string; // 'REVIEW_REQUEST' | 'OVERDUE_WARNING' | 'STATUS_CHANGE' | 'ASSIGNMENT' | 'REWORK' | 'SYSTEM'

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  // FK → Người nhận
  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientId' })
  recipient: User;

  @Column()
  recipientId: number;

  @Column({ nullable: true })
  senderId: number; // Người gửi (nếu có)

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  link: string; // Deep link: '/working-papers', '/recommendations'...

  @Column({ nullable: true })
  relatedEntity: string; // 'WorkingPaper' | 'Recommendation' | 'AuditFinding'...

  @Column({ nullable: true })
  relatedEntityId: number;

  @CreateDateColumn()
  createdAt: Date;
}
