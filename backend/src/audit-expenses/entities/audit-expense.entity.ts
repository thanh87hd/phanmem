import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('audit_expenses')
export class AuditExpense {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  engagementId: number;

  @Column({ nullable: true })
  engagementName: string;

  @Column({ default: 'Travel' })
  category: string; // Travel | Hotel | Meal | Transportation | Stationery | Other

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ default: 'VND' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date', nullable: true })
  expenseDate: string;

  @Column({ nullable: true })
  receiptUrl: string;

  @Column({ nullable: true })
  submittedById: number;

  @Column({ nullable: true })
  submittedByName: string;

  @Column({ nullable: true })
  approvedById: number;

  @Column({ nullable: true })
  approvedByName: string;

  @Column({ default: 'Draft' })
  status: string; // Draft | Submitted | Approved | Rejected

  @Column({ type: 'text', nullable: true })
  rejectReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
