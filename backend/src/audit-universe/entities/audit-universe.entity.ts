import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { RiskAssessment } from '../../risk-assessments/entities/risk-assessment.entity';

@Entity('audit_universe')
export class AuditUniverse {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(() => RiskAssessment, (assessment) => assessment.auditUniverse)
  assessments: RiskAssessment[];

  @Column()
  name: string; // Tên quy trình/hoạt động có thể được kiểm toán

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  customFields: Record<string, any>;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  department: string; // Tên đơn vị phụ trách (hiển thị)

  @Column({ nullable: true })
  departmentCode: string; // Mã đơn vị trong cơ cấu tổ chức (liên kết chính xác)

  /**
   * Phân loại đối tượng kiểm toán:
   * HoiSo | ChiNhanh | PGD | PGDBD | CongTyCon | HeThong | ChuyenDe
   */
  @Column({ default: 'ChiNhanh' })
  auditCategory: string;

  @Column({ default: 'PKT_DVKD' })
  ownerTeam: string; // PKT_HoiSo | PKT_DVKD | TongHop

  @Column({ default: 'Active' })
  status: string; // Active, Inactive

  @Column({ type: 'date', nullable: true })
  lastAuditDate: string;

  @Column({ type: 'int', default: 1 })
  layer: number; // 1: Process/HQ, 2: Branch/Vertical

  @Column({ type: 'int', default: 2026 })
  nextAuditYear: number; // Năm khuyến nghị kiểm toán tiếp theo

  @Column({ default: 'Standard' })
  planningPriority: string; // Prioritized | Standard

  @Column({ type: 'int', default: 1 })
  lineOfDefense: number; // 1, 2, or 3

  @Column({ type: 'text', nullable: true })
  priorityReason: string | null;

  @Column({ nullable: true })
  transferredFromUniverseId: number; // Kế thừa từ thực thể cũ

  @Column({ nullable: true })
  transferredFromDeptCode: string; // Mã đơn vị cũ chuyển giao

  @Column({ type: 'text', nullable: true })
  transferNotes: string; // Ghi chú chuyển đổi (nâng cấp PGD lên Chi nhánh, sáp nhập...)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
