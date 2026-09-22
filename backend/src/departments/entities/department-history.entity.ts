import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Department } from './department.entity';

@Index(['departmentId', 'periodYear'])
@Index(['changeType'])
@Entity('department_histories')
export class DepartmentHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'departmentId' })
  department: Department;

  @Column({ nullable: true })
  departmentId: number;

  @Column()
  departmentCode: string; // Mã đơn vị tại thời điểm ghi nhận

  @Column()
  departmentName: string; // Tên đơn vị

  @Column({ type: 'int' })
  periodYear: number; // Kỳ/Năm (vd: 2024, 2025, 2026)

  /**
   * Loại hình đơn vị tại kỳ:
   * ChiNhanh | PGD | PGDBD_TKBD | Khoi | Phong | TrungTam
   */
  @Column()
  unitType: string;

  /**
   * Biến động tổ chức:
   * ThanhLapMoi | NangCap (PGD -> Chi nhánh) | SapNhap | ChuyenDoiMoHinh | DongCua | GiuNguyen
   */
  @Column({ default: 'GiuNguyen' })
  changeType: string;

  @Column({ nullable: true })
  previousUnitType: string; // Loại hình ở kỳ trước

  @Column({ nullable: true })
  decisionNumber: string; // Số QĐ chuyển đổi/thành lập/sáp nhập

  @Column({ type: 'date', nullable: true })
  effectiveDate: string; // Ngày hiệu lực biến động

  @Column({ type: 'text', nullable: true })
  notes: string; // Ghi chú chi tiết (vd: Sáp nhập PGD A vào CN Tây Nghệ An, nâng hạng PGD loại 1)

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // Lưu thông tin số lượng nhân sự, số lượng điểm giao dịch trực thuộc...

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
