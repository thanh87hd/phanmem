import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('timesheets')
export class Timesheet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number; // Ai tạo

  @Column()
  username: string; // Tên hiển thị của user

  @Column({ type: 'date' })
  date: string; // Ngày làm việc

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  hours: number; // Số giờ làm

  @Column({ nullable: true })
  engagementId: number; // Thuộc đoàn kiểm toán nào (nếu có)

  @Column({ nullable: true })
  engagementName: string;

  @Column({ nullable: true })
  taskId: number; // Thuộc nhiệm vụ nào (nếu có)

  @Column({ nullable: true })
  taskName: string;

  @Column({ type: 'text', nullable: true })
  description: string; // Chi tiết công việc

  @Column({ nullable: true })
  generalTaskId: number; // Công việc chung (nếu không gắn engagement)

  @Column({ default: 'Audit' })
  category: string; // Audit | Training | Policy | Meeting | Other

  @Column({ default: 'Draft' })
  status: string; // Draft | Submitted | Approved | Rejected

  @Column({ type: 'text', nullable: true })
  approverNotes: string; // Lời phê của người duyệt

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
