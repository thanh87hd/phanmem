import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('general_tasks')
export class GeneralTask {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: 'Other' })
  category: string; // Policy | Report | Training | Meeting | Support | Other

  @Column({ nullable: true })
  assignedToId: number;

  @Column({ nullable: true })
  assignedToName: string;

  @Column({ nullable: true })
  assignedById: number;

  @Column({ nullable: true })
  assignedByName: string;

  @Column({ nullable: true })
  teamCode: string; // PKT_HoiSo | PKT_DVKD | TongHop

  @Column({ default: 'Medium' })
  priority: string; // High | Medium | Low

  @Column({ type: 'date', nullable: true })
  dueDate: string;

  @Column({ type: 'date', nullable: true })
  completedDate: string;

  @Column({ default: 'Open' })
  status: string; // Open | InProgress | Done | Cancelled

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
