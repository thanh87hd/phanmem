import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Lưu điểm KPI đã tính theo nhân sự và kỳ đánh giá.
 * Snapshot: ngưỡng tại thời điểm tính được lưu cùng để tránh lệch khi thay đổi sau.
 */
@Entity('kpi_scores')
@Index(['userId', 'period', 'kpiCode'], { unique: true })
export class KpiScore {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ length: 50 })
  username: string;

  @Column({ length: 100 })
  fullName: string;

  @Column({ length: 100, nullable: true })
  roleType: string; // KTV | LeadAuditor | Deputy

  @Column({ length: 100, nullable: true })
  department: string;

  /** Kỳ đánh giá: "2026", "2026-H1", "2026-Q2", "2026-M06" */
  @Column({ length: 20 })
  period: string;

  /** Monthly | Quarterly | HalfYear | Yearly */
  @Column({ length: 20 })
  periodType: string;

  @Column({ length: 20 })
  kpiCode: string;

  @Column({ type: 'text' })
  kpiName: string;

  @Column({ length: 50 })
  bscPillar: string;

  /** Trọng số snapshot tại thời điểm tính */
  @Column({ type: 'decimal', precision: 5, scale: 4 })
  weight: number;

  /** Ngưỡng chấp nhận snapshot */
  @Column({ type: 'decimal', precision: 5, scale: 4 })
  threshold: number;

  /** Chỉ tiêu phân giao snapshot */
  @Column({ type: 'decimal', precision: 5, scale: 4 })
  target: number;

  /** Kết quả thực hiện thực tế (raw value — tỷ lệ 0–1 hoặc số tuyệt đối) */
  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  actualValue: number;

  /** Tỷ lệ hoàn thành = actual/target (capped tại maxCap) */
  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  completionRate: number;

  /** Điểm có trọng số = completionRate × weight */
  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  weightedScore: number;

  /** Ghi chú / lý do N/A */
  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  calculatedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
