import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { AuditEngagement } from '../../audit-engagements/entities/audit-engagement.entity';
import { AuditFinding } from './audit-finding.entity';

@Entity('audit_minutes')
export class AuditMinute {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => AuditEngagement, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'engagementId' })
  engagement: AuditEngagement;

  @Column({ nullable: true })
  engagementId: number;

  @Column()
  minuteNo: string;

  @Column()
  title: string; // Tên chi nhánh/phòng ban vi phạm

  @Column({ type: 'date', nullable: true })
  issueDate: string;

  @Column({ default: 'Draft' })
  status: string; // Draft | Sent | Confirmed

  @Column({ type: 'text', nullable: true })
  summaryContent: string;

  @Column({ nullable: true })
  auditedUnitName: string;

  @Column({ nullable: true })
  leadAuditorName: string;

  @Column({ type: 'text', nullable: true })
  teamMembersText: string;

  @Column({ nullable: true })
  fieldworkPeriod: string;

  @Column({ nullable: true })
  decisionNumber: string;

  @Column({ default: 'MB04_MERGED' })
  minuteType: string; // MB04_TD | MB04_PTD | MB04_PGDBD | MB04_MERGED

  @Column({ type: 'text', nullable: true })
  postalRepresentative: string; // Đại diện Bưu điện tham gia ký xác nhận (GDV Hương, KSV Hằng...)

  @Column({ nullable: true })
  meetingLocation: string; // Địa điểm tổ chức họp Exit Meeting

  @Column({ type: 'text', nullable: true })
  unitRepresentativesText: string; // Đại diện ĐVKD tham gia họp

  @Column({ type: 'text', nullable: true })
  auditeeFeedback: string; // Ý kiến giải trình của ĐVKD

  @Column({ type: 'text', nullable: true })
  commitmentNotes: string; // Cam kết thời hạn khắc phục của ĐVKD

  @Column({ type: 'int', default: 0 })
  leadReviewCount: number; // Đếm số lần Trưởng đoàn review/chỉnh sửa Biên bản

  @Column({ type: 'jsonb', default: () => "'[]'" })
  reviewHistory: {
    reviewerId: number;
    reviewerName: string;
    role: string;
    reviewedAt: string;
    action: string;
    comments?: string;
  }[];

  @OneToMany(() => AuditFinding, (finding) => finding.minute)
  findings: AuditFinding[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
