import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('password_change_requests')
export class PasswordChangeRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  username: string;

  @Column({ type: 'text', nullable: true })
  reason: string; // Lý do yêu cầu đổi mật khẩu

  @Column({ default: 'pending' })
  status: string; // pending | approved | rejected

  @Column({ nullable: true })
  adminId: number; // Admin xử lý yêu cầu

  @Column({ nullable: true })
  adminUsername: string;

  @Column({ type: 'text', nullable: true })
  adminNote: string; // Ghi chú của Admin

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;
}
