import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('monitoring_alerts')
export class MonitoringAlert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  category: string; // AML | Credit | Operational | HR

  @Column()
  riskLevel: string; // High | Medium | Low

  @Column({ nullable: true })
  unitName: string; // Tên chi nhánh / đơn vị liên quan

  @Column({ type: 'json', nullable: true })
  relatedData: any; // Thông tin giao dịch/đối tượng nghi vấn

  @Column({ default: 'Open' })
  status: string; // Open | UnderInvestigation | FalsePositive | Resolved

  @Column({ nullable: true })
  assignedTo: string;

  @Column({ type: 'text', nullable: true })
  resolutionNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
