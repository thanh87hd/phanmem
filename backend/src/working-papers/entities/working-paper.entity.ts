import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { AuditEngagement } from '../../audit-engagements/entities/audit-engagement.entity';
import { User } from '../../users/entities/user.entity';
import { AuditWorkstream } from '../../audit-engagements/entities/audit-workstream.entity';
import { AuditReviewNote } from './audit-review-note.entity';

@Index(['engagementId', 'status'])
@Index(['creatorId'])
@Index(['reviewerId'])
@Index(['referenceCode'])
@Entity('working_papers')
export class WorkingPaper {
  @PrimaryGeneratedColumn()
  id: number;

  // FK → Cuộc kiểm toán
  @ManyToOne(() => AuditEngagement, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'engagementId' })
  engagement: AuditEngagement;

  @Column({ nullable: true })
  engagementId: number;

  @ManyToOne(() => AuditWorkstream, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'workstreamId' })
  workstream: AuditWorkstream;

  @Column({ nullable: true })
  workstreamId: number;

  @Column({ name: 'planName', nullable: true })
  legacyPlanName: string; // Denormalized: Tên Kế hoạch năm

  @Column()
  title: string;

  @Column({ nullable: true })
  referenceCode: string; // Mã tham chiếu: WP-001, WP-002...

  @Column({ default: 'WP' })
  type: string; // 'Program' | 'WP'

  @Column({ nullable: true })
  domain: string; // 'credit' | 'it' | 'op' | 'compliance' | 'finance'

  @Column({ type: 'text', nullable: true })
  objectives: string; // Mục tiêu kiểm toán

  @Column({ type: 'text', nullable: true })
  riskDescription: string; // Rủi ro tương ứng

  @Column({ type: 'text', nullable: true })
  methodology: string; // Phương pháp (VD: Chọn mẫu)

  @Column({ type: 'text', nullable: true })
  procedures: string; // Các bước thực hiện chi tiết

  @Column({ type: 'text', nullable: true })
  sampleSelection: string; // Phương pháp chọn mẫu

  @Column({ type: 'text', nullable: true })
  conclusion: string; // Kết luận của KTV

  @Column({ default: 'Draft' })
  status: string; // Draft | Submitted | UnderReview | Approved | Rework

  // FK → KTV lập
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'creatorId' })
  creatorUser: User;

  @Column({ nullable: true })
  creatorId: number;

  @Column({ name: 'creator', nullable: true })
  legacyCreator: string; // Denormalized: KTV lập

  // FK → Trưởng đoàn duyệt
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewerId' })
  reviewerUser: User;

  @Column({ nullable: true })
  reviewerId: number;

  @Column({ name: 'reviewedBy', nullable: true })
  legacyReviewedBy: string; // Denormalized

  @Column({ type: 'text', nullable: true })
  reviewNotes: string; // Ghi chú soát xét

  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'" })
  reviewHistory: {
    iteration: number;
    action: 'SUBMIT' | 'REWORK' | 'APPROVE';
    actorId: number;
    actorName: string;
    role: string;
    timestamp: string;
    notes?: string;
  }[];

  @Column({ nullable: true })
  preparerId: number;

  @Column({ type: 'timestamp', nullable: true })
  preparedAt: Date;

  @Column({ nullable: true })
  leadAuditorId: number;

  @Column({ type: 'timestamp', nullable: true })
  leadApprovedAt: Date;

  @Column({ default: 'DRAFT' })
  signoffStatus: string;

  @OneToMany(() => AuditReviewNote, (note) => note.workingPaper)
  reviewNoteItems: AuditReviewNote[];

  @Column({ nullable: true })
  templateId: number;

  @Column({ type: 'json', nullable: true })
  attachments: {
    name: string;
    fileUrl: string;
    uploadedBy: string;
    uploadedAt: string;
  }[];

  @Column({ type: 'json', nullable: true })
  controlAssessments: {
    controlId: string;
    controlDescription: string;
    designEffectiveness: string;
    operatingEffectiveness: string;
    testConclusion: string;
  }[];

  @Column({ type: 'json', nullable: true })
  templateData: any;

  @VersionColumn({ default: 1 })
  version: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
