import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';
import { AuditEngagement } from '../../audit-engagements/entities/audit-engagement.entity';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 'General' })
  sourceType: string; // 'Audit' | 'General'

  @ManyToOne(() => AuditEngagement, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'engagementId' })
  engagement?: AuditEngagement;

  @Column({ nullable: true })
  engagementId: number; // Thuộc cuộc kiểm toán nào (nếu Audit)

  @Column({ nullable: true })
  engagementName: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: 'Other' })
  category: string; // Phân loại (đối với general task)

  // Sub-task relationship
  @ManyToOne(() => Task, (task) => task.subTasks, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentId' })
  parent: Task;

  @Column({ nullable: true })
  parentId: number;

  @OneToMany(() => Task, (task) => task.parent)
  subTasks: Task[];

  // Assignee and Assigner
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedToId' })
  assignedToUser: User;

  @Column({ nullable: true })
  assignedToId: number;

  @Column({ nullable: true })
  assignedToName: string;

  get assignedTo(): string {
    return this.assignedToName || '';
  }

  set assignedTo(val: string) {
    this.assignedToName = val;
  }

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedById' })
  assignedByUser: User;

  @Column({ nullable: true })
  assignedById: number;

  @Column({ nullable: true })
  assignedByName: string;

  // Department / Block tracking
  @Column({ nullable: true })
  assignedDepartmentId: number; // Để tiện tra cứu theo phòng

  @Column({ nullable: true })
  teamCode: string; // Khối (PKT_HoiSo | PKT_DVKD | TongHop)

  // Timing
  @Column({ default: 'Medium' })
  priority: string; // High | Medium | Low

  @Column({ default: 'ShortTerm' })
  durationCategory: string; // ShortTerm | LongTerm

  @Column({ type: 'date', nullable: true })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  dueDate: string;

  @Column({ type: 'date', nullable: true })
  completedDate: string;

  // Periodic Tasks
  @Column({ default: false })
  isPeriodic: boolean;

  @Column({ nullable: true })
  frequency: string; // Daily | Weekly | Monthly | Yearly

  // Status & Progress
  @Column({ default: 'Open' })
  status: string; // Open | InProgress | Review | Done | Cancelled

  @Column({ type: 'float', default: 0 })
  progress: number; // 0 - 100

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true })
  estimatedHours: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
