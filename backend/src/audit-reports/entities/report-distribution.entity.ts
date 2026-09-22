import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditReport } from './audit-report.entity';
import { User } from '../../users/entities/user.entity';

@Entity('report_distributions')
export class ReportDistribution {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => AuditReport, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reportId' })
  report: AuditReport;

  @Column()
  reportId: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'recipientUserId' })
  recipientUser: User;

  @Column({ nullable: true })
  recipientUserId: number;

  @Column()
  recipientName: string;

  @Column({ nullable: true })
  recipientEmail: string;

  @Column({ default: 'AuditeeHead' })
  recipientRole: string; // AuditeeHead | BranchManager | BoardOfDirectors | SupervisoryBoard | CEO | External

  @Column({ nullable: true })
  organizationUnit: string; // Tên đơn vị / Chi nhánh nhận báo cáo

  @Column({ default: 'Sent' })
  status: string; // Sent | Delivered | Read | Acknowledged

  @Column({ default: 'SystemPortal' })
  distributionChannel: string; // SystemPortal | Email | OfficialLetter

  @CreateDateColumn()
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date; // Thời điểm người nhận mở xem báo cáo

  @Column({ type: 'timestamp', nullable: true })
  acknowledgedAt: Date; // Thời điểm xác nhận đã nhận và tiếp thu báo cáo

  @Column({ type: 'text', nullable: true })
  acknowledgementNotes: string; // Ý kiến phản hồi / cam kết của đơn vị tiếp nhận

  @UpdateDateColumn()
  updatedAt: Date;
}
