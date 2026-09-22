import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

/**
 * Lưu ngưỡng chỉ tiêu phân giao BSC-KPI theo kỳ và chức danh.
 * Cấu hình được qua UI bởi Admin/CAE.
 */
@Entity('kpi_targets')
@Unique(['period', 'roleType', 'kpiCode'])
export class KpiTarget {
  @PrimaryGeneratedColumn()
  id: number;

  /** Kỳ đánh giá: "2026", "2026-H1", "2026-Q2", "2026-M06" */
  @Column({ length: 50, default: '2026-H1' })
  period: string;

  /** Loại vai trò: KTV | LeadAuditor | Deputy | All */
  @Column({ length: 50, default: 'All' })
  roleType: string;

  /** Mã KPI theo BSC: FIN_01, CUS_01, PRO_01..03, LRN_01..05 */
  @Column({ length: 50, nullable: true })
  kpiCode: string;

  /** Tên chỉ tiêu hiển thị */
  @Column({ type: 'text' })
  kpiName: string;

  /** Trụ cột BSC: TÀI CHÍNH | KHÁCH HÀNG | QUY TRÌNH | HỌC HỎI & PHÁT TRIỂN */
  @Column({ length: 50 })
  bscPillar: string;

  /** Trọng số trong tổng điểm (0–1, tổng 4 trụ cột = 1.0) */
  @Column({ type: 'decimal', precision: 5, scale: 4 })
  weight: number;

  /** Ngưỡng chấp nhận (minimum để không bị "Không đạt") */
  @Column({ type: 'decimal', precision: 5, scale: 4 })
  threshold: number;

  /** Chỉ tiêu phân giao (mức đạt yêu cầu) */
  @Column({ type: 'decimal', precision: 5, scale: 4 })
  target: number;

  /** Mức trần tối đa (cap tính điểm, thường = 1.0 hoặc cao hơn) */
  @Column({ type: 'decimal', precision: 5, scale: 4, default: 1.0 })
  maxCap: number;

  /** Đơn vị đo: %, điểm, ngày, giờ */
  @Column({ length: 20, default: '%' })
  unit: string;

  /** Mô tả phương pháp đo lường */
  @Column({ type: 'text', nullable: true })
  description: string;

  /** Bật/tắt kích hoạt chỉ tiêu trong kỳ */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /** Chỉ tiêu phát sinh riêng do người dùng tự tạo */
  @Column({ type: 'boolean', default: false })
  isCustom: boolean;

  /** Phòng ban áp dụng riêng (nếu có, null = toàn khối) */
  @Column({ length: 100, nullable: true })
  department?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
