import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditUniverse } from '../../audit-universe/entities/audit-universe.entity';

@Entity('kri_alerts')
export class KriAlert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  kriCode: string; // KRI_NPL, KRI_IT_DOWNTIME, KRI_AML_ALERT...

  @Column()
  kriName: string; // Tỷ lệ nợ xấu nhóm 2, Thời gian gián đoạn hệ thống...

  // Đơn vị & Cơ cấu tổ chức
  @Column({ type: 'int', nullable: true })
  departmentId: number; // ID phòng ban chuẩn hóa

  @Column()
  departmentName: string; // Tên đơn vị (snapshot)

  @Column({ nullable: true })
  departmentCode: string; // Mã đơn vị (liên kết cơ cấu tổ chức)

  // Giá trị thực tế & Cảnh báo (Chuẩn hóa kèm dual-mapping)
  @Column({ nullable: true })
  observedValue: string; // Giá trị quan sát chuẩn hóa (chuẩn mới)

  @Column({ nullable: true })
  currentValue: string; // Giá trị hiện tại (legacy tương thích)

  @Column({ nullable: true })
  figure: string; // Số liệu thực tế (legacy tương thích)

  @Column({ default: '0' })
  thresholdValue: string; // Hạn mức cảnh báo chuẩn hóa

  @Column({ nullable: true })
  threshold: string; // Ngưỡng hạn mức (legacy tương thích)

  @Column({ nullable: true })
  unit: string; // Đơn vị tính (%, tỷ VND, phút...)

  @Column({ nullable: true })
  category: string; // Danh mục (ví dụ: General/ Tổng hợp)

  @Column({ nullable: true })
  metrics: string; // Chỉ số (Metrics)

  @Column({ nullable: true })
  dataSource: string; // Nguồn dữ liệu (Data source)

  @Column({ nullable: true })
  currentRating: string; // Xếp hạng hiện tại (Current Rating)

  @Column({ nullable: true })
  expectedRating: string; // Xếp hạng dự kiến (Expected Rating)

  @Column({ nullable: true })
  commentary: string; // Nhận xét (Commentary)

  @Column({ nullable: true })
  mitigation: string; // Biện pháp giảm thiểu (Mitigation)

  @Column({ nullable: true })
  note: string; // Ghi chú từ file upload

  @Column()
  severity: string; // Low | Medium | High | Critical

  @Column({ default: 'Active' })
  status: string; // Active | Addressed | Ignored

  @Column({ type: 'int', nullable: true })
  reportMonth: number; // 1-12, tháng báo cáo KRI

  @Column({ type: 'int', nullable: true })
  reportYear: number; // Năm báo cáo KRI (2025, 2026...)

  // Khóa ngoại liên kết Audit Universe
  @Column({ type: 'int', nullable: true })
  auditUniverseId: number;

  @ManyToOne(() => AuditUniverse, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'auditUniverseId' })
  auditUniverse?: AuditUniverse;

  @Column({ nullable: true })
  sourceFileName: string; // Tên file gốc đã upload

  @Column({ nullable: true })
  uploadBatchId: string; // ID nhóm upload để gom các file cùng lượt

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
