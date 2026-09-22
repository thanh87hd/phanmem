import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('process_loopholes')
export class ProcessLoophole {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string; // Tên sai phạm lặp lại

  @Column()
  category: string;

  @Column()
  count: number; // Số lần lặp lại

  @Column()
  riskLevel: string;

  @Column()
  loopholeType: string; // Design Flaw, Control Weakness...

  @Column({ type: 'text' })
  aiRecommendation: string;

  @Column()
  severity: string;

  @Column({ default: 'Pending' }) // Pending, Approved, Rejected
  status: string;

  @Column({ nullable: true })
  approvedBy: string;

  @Column({ nullable: true })
  approvedAt: Date;

  @Column({ type: 'simple-json', nullable: true })
  metadata: any; // Lưu danh sách các engagement liên quan

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
