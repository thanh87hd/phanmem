import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('training_records')
export class TrainingRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ nullable: true })
  userName: string;

  @Column()
  courseName: string;

  @Column({ nullable: true })
  provider: string; // Nhà cung cấp / Tổ chức đào tạo

  @Column({ type: 'date', nullable: true })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  endDate: string;

  @Column({ type: 'decimal', precision: 5, scale: 1, default: 0 })
  cpeHours: number; // Số giờ CPE

  // ===== IIA Standard 4.2: Continuous Professional Development =====
  @Column({ default: 'None' })
  certificationType: string; // None | CIA | CISA | CFE | CPA | Other

  @Column({ type: 'decimal', precision: 4, scale: 1, default: 0 })
  ethicsHours: number; // Số giờ đạo đức nghề nghiệp (IIA yêu cầu tối thiểu 2h/năm)

  @Column({ default: false })
  isVerified: boolean; // CAE hoặc Training Officer xác minh chứng nhận

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;
  // ===== End CPD =====

  @Column({ default: 'Technical' })
  category: string; // Technical | Leadership | Compliance | SoftSkills | Other

  @Column({ nullable: true })
  certificateUrl: string;

  @Column({ nullable: true })
  verifiedById: number;

  @Column({ nullable: true })
  verifiedByName: string;

  @Column({ default: new Date().getFullYear() })
  year: number;

  @Column({ default: 'Completed' })
  status: string; // Planned | InProgress | Completed | Cancelled

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
