import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Bản chấm điểm KPI cá nhân theo kỳ đánh giá (MB02.HRM.2026).
 * Workflow phê duyệt 2 cấp: Lãnh đạo Phòng (L1) → Lãnh đạo Khối (L2).
 *
 * Status flow: Draft → Submitted → ApprovedL1 → ApprovedL2
 *                                 ↘ Rejected (trả lại)
 */
@Entity('kpi_assessments')
@Index(['userId', 'period'], { unique: true })
export class KpiAssessment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ length: 50 })
  username: string;

  @Column({ length: 100 })
  fullName: string;

  @Column({ length: 100, nullable: true })
  department: string;

  /** Kỳ đánh giá: "2026-H1", "2026", etc. */
  @Column({ length: 50 })
  period: string;

  /** Draft | Submitted | ApprovedL1 | ApprovedL2 | Rejected */
  @Column({ length: 20, default: 'Draft' })
  status: string;

  /** Tổng điểm hoàn thành (0–1+) */
  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  totalScore: number;

  /** Phân nhóm xếp loại: Vượt trội | Vượt yêu cầu | Đạt yêu cầu | Cần cố gắng */
  @Column({ length: 50, nullable: true })
  xepLoai: string;

  /** Ý kiến phản hồi của CBNV (cuộc họp 1-1) */
  @Column({ type: 'text', nullable: true })
  ktvFeedback: string;

  /** Nhận xét & định hướng của Lãnh đạo Phòng (CBQL cấp N+1) */
  @Column({ type: 'text', nullable: true })
  managerFeedback: string;

  /**
   * Chi tiết từng tiêu chí chấm điểm.
   * JSON array of { kpiCode, nhomTieuChi, tieuChi, tyTrong, nguong, chiTieuGiao, mucTran, ketQuaThucHien, completionRate, diemHoanThanh, ghiChu }
   */
  @Column({ type: 'simple-json', nullable: true })
  items: any[];

  // ---- Timestamps phê duyệt ----

  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Column({ nullable: true })
  approvedL1By: number;

  @Column({ type: 'timestamp', nullable: true })
  approvedL1At: Date;

  @Column({ nullable: true })
  approvedL2By: number;

  @Column({ type: 'timestamp', nullable: true })
  approvedL2At: Date;

  @Column({ nullable: true })
  rejectedBy: number;

  @Column({ type: 'timestamp', nullable: true })
  rejectedAt: Date;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
