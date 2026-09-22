import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditEngagement } from '../../audit-engagements/entities/audit-engagement.entity';

@Entity('audit_tasks')
export class AuditTask {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => AuditEngagement, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'engagementId' })
  engagement: AuditEngagement;

  @Column({ nullable: true })
  engagementId: number; // Thuộc cuộc kiểm toán nào

  @Column()
  engagementName: string; // Tên cuộc kiểm toán (denormalized)

  @Column()
  title: string; // Tên nhiệm vụ

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  assignedTo: string; // Tên người được giao

  @Column({ default: 'Todo' })
  status: string; // Todo | InProgress | Review | Done

  @Column({ nullable: true })
  priority: string; // Low | Medium | High

  @Column({ type: 'date', nullable: true })
  dueDate: string;

  @Column({ nullable: true })
  estimatedHours: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
