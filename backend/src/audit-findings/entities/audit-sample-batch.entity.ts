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
import { AuditEngagement } from '../../audit-engagements/entities/audit-engagement.entity';
import { WorkingPaper } from '../../working-papers/entities/working-paper.entity';
import { AuditSample } from './audit-sample.entity';
import { SampleType, SamplingMethod } from './sample-enums';
export { SampleType, SamplingMethod };

@Entity('audit_sample_batches')
export class AuditSampleBatch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  batchName: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'CREDIT',
    nullable: true,
  })
  auditDomain: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: SampleType.DETAIL,
  })
  sampleType: SampleType;

  @Column({
    type: 'varchar',
    length: 30,
    default: SamplingMethod.RANDOM,
  })
  samplingMethod: SamplingMethod;

  @Column({ type: 'int', default: 0 })
  populationSize: number;

  @Column({ type: 'int', default: 0 })
  sampleSize: number;

  @Column({ type: 'float', nullable: true })
  confidenceLevel: number; // e.g. 95

  @Column({ type: 'float', nullable: true })
  tolerableError: number; // e.g. 5 (%)

  @Column({ type: 'text', nullable: true })
  populationSource: string; // mô tả nguồn dữ liệu tổng thể

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ default: 'Draft' })
  status: string; // Draft | Finalized | Archived

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  controlEffectiveness: string; // EFFECTIVE | PARTIALLY_EFFECTIVE | INEFFECTIVE

  @Column({ type: 'text', nullable: true })
  controlConclusion: string;

  // FK → Cuộc kiểm toán
  @ManyToOne(() => AuditEngagement, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'engagementId' })
  engagement: AuditEngagement;

  @Column({ nullable: true })
  engagementId: number;

  // FK → Giấy tờ làm việc
  @ManyToOne(() => WorkingPaper, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'workingPaperId' })
  workingPaper: WorkingPaper;

  @Column({ nullable: true })
  workingPaperId: number;

  @Column({ nullable: true })
  createdBy: string;

  @Column({ nullable: true })
  assignedAuditorId: number; // ID KTV phụ trách thực hiện mẫu này

  @Column({ nullable: true })
  assignedAuditorName: string; // Tên KTV phụ trách

  @Column({ default: 'None' })
  changeStatus: string; // None | PendingLeader | Approved | Rejected

  @Column({ type: 'text', nullable: true })
  changeReason: string; // Lý do điều chỉnh/bổ sung mẫu

  @Column({ type: 'timestamp', nullable: true })
  changeRequestedAt: Date;

  @Column({ nullable: true })
  changeRequestedBy: string; // Tên KTV yêu cầu điều chỉnh mẫu

  @Column({ nullable: true })
  changeRequestedById: number; // ID KTV yêu cầu điều chỉnh mẫu

  @Column({ type: 'timestamp', nullable: true })
  changeApprovedAt: Date;

  @Column({ nullable: true })
  changeApprovedBy: string; // Trưởng đoàn phê duyệt

  @Column({ type: 'timestamp', nullable: true })
  reportedToDepartmentAt: Date; // Thời điểm báo cáo cấp Phòng/Khối

  // Relation to individual samples
  @OneToMany(() => AuditSample, (sample) => sample.batch, { cascade: true })
  samples: AuditSample[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
