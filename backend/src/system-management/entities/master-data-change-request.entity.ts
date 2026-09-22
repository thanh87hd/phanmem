import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ChangeCategory {
  ORGANIZATION = 'ORGANIZATION', // Cơ cấu tổ chức (Department/Branch/PGD)
  RISK = 'RISK', // Danh mục rủi ro (RiskCriterion/AuditUniverse)
  DEFECT = 'DEFECT', // Danh mục lỗi (DefectCode)
}

export enum ChangeType {
  ADD = 'ADD', // Thêm mới
  UPDATE = 'UPDATE', // Sửa đổi
  DEACTIVATE = 'DEACTIVATE', // Vô hiệu hóa / Đóng đơn vị
  RESTRUCTURE = 'RESTRUCTURE', // Sáp nhập / Nâng cấp mô hình
}

export enum ChangeRequestStatus {
  PENDING_L1 = 'Pending_L1', // Chờ Lãnh đạo Phòng soát xét
  PENDING_L2 = 'Pending_L2', // Chờ Lãnh đạo Khối phê duyệt
  APPROVED = 'Approved', // Đã phê duyệt chính thức
  REJECTED = 'Rejected', // Từ chối phê duyệt
}

@Entity('master_data_change_requests')
export class MasterDataChangeRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ChangeCategory,
    default: ChangeCategory.ORGANIZATION,
  })
  category: ChangeCategory;

  @Column({
    type: 'enum',
    enum: ChangeType,
    default: ChangeType.ADD,
  })
  changeType: ChangeType;

  @Column({ nullable: true })
  targetId: number;

  @Column({ nullable: true })
  targetCode: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'jsonb', nullable: true })
  proposedData: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  currentData: Record<string, any>;

  /** Phát sinh ngoài kế hoạch ban đầu sau khi chốt baseline đầu năm -> Đánh giá là Rủi ro Mới */
  @Column({ default: true })
  isMidYearAddition: boolean;

  /** Mức độ tác động rủi ro: 1 (Thấp), 2 (Trung bình), 3 (Cao/Trọng yếu) */
  @Column({ default: 2 })
  riskImpactLevel: number;

  @Column({
    type: 'enum',
    enum: ChangeRequestStatus,
    default: ChangeRequestStatus.PENDING_L1,
  })
  status: ChangeRequestStatus;

  @Column({ nullable: true })
  requestedBy: string;

  @Column({ nullable: true })
  requestedByUserId: number;

  @Column({ nullable: true })
  reviewerL1Name: string;

  @Column({ nullable: true })
  reviewerL1Notes: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewedL1At: Date;

  @Column({ nullable: true })
  approverL2Name: string;

  @Column({ nullable: true })
  approverL2Notes: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedL2At: Date;

  /** Ghi nhận điểm thưởng BSC-KPI cho cá nhân/đoàn nhận diện phát sinh mới */
  @Column({ type: 'float', default: 0 })
  kpiBonusPoints: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
