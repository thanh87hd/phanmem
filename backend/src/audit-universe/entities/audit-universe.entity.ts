import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('audit_universe')
export class AuditUniverse {
  @PrimaryGeneratedColumn()
  id: number;

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

  @Column({ type: 'float', default: 2.5 })
  financialSize: number; // Điểm quy mô tài sản/giao dịch: 1.0 - 5.0

  @Column({ type: 'float', default: 2.5 })
  operationalRiskScore: number; // Chỉ số rủi ro vận hành Tuyến 2: 1.0 - 5.0

  @Column({ type: 'float', default: 2.5 })
  pastFindingsScore: number; // Điểm phát hiện sai phạm cũ: 1.0 - 5.0

  @Column({ type: 'float', nullable: true })
  riskScore: number; // Điểm rủi ro tổng hợp calculated

  @Column({ nullable: true })
  dynamicRiskRating: string; // Hạng 1 -> Hạng 5 | High | Medium | Low | null (Chưa đánh giá)

  @Column({ type: 'int', default: 1 })
  layer: number; // 1: Process/HQ, 2: Branch/Vertical

  @Column({ type: 'jsonb', nullable: true })
  scoreDetails: Record<string, any>; // Lưu chi tiết các thành phần điểm của Layer 1 / Layer 2

  @Column({ type: 'int', default: 2026 })
  nextAuditYear: number; // Năm khuyến nghị kiểm toán tiếp theo

  @Column({ default: 'Standard' })
  planningPriority: string; // Prioritized | Standard

  @Column({ type: 'int', default: 1 })
  lineOfDefense: number; // 1, 2, or 3

  @Column({ type: 'text', nullable: true })
  priorityReason: string | null;

  @Column({ nullable: true })
  transferredFromUniverseId: number; // Kế thừa rủi ro từ thực thể cũ

  @Column({ nullable: true })
  transferredFromDeptCode: string; // Mã đơn vị cũ chuyển giao

  @Column({ type: 'float', nullable: true })
  transferredRiskScore: number; // Điểm rủi ro kế thừa

  @Column({ type: 'text', nullable: true })
  transferNotes: string; // Ghi chú chuyển đổi (nâng cấp PGD lên Chi nhánh, sáp nhập...)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
