import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ChangeRequestStatus {
  DRAFT = 'Draft',
  PENDING_L1 = 'PendingL1', // Chờ Trưởng/Phó Phòng duyệt
  PENDING_L2 = 'PendingL2', // Phòng đã duyệt, chờ Lãnh đạo Khối KTNB duyệt
  APPROVED = 'Approved', // Đã duyệt cấp Khối -> Áp dụng chính thức
  REJECTED = 'Rejected', // Bị từ chối
}

@Entity('risk_profile_change_requests')
export class RiskProfileChangeRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string; // Tên đề xuất (VD: Cập nhật HSRR Mảng CNTT & An ninh mạng)

  @Column({ nullable: true })
  domainCode: string; // Mã mảng nghiệp vụ (hoặc 'ALL')

  @Column({ default: 'ManualEdit' })
  requestType: string; // 'ManualEdit' | 'ImportExcel' | 'NewRisk' | 'DeleteRisk'

  @Column({
    type: 'varchar',
    length: 30,
    default: ChangeRequestStatus.PENDING_L1,
  })
  status: ChangeRequestStatus;

  @Column({ type: 'text', nullable: true })
  reason: string; // Lý do điều chỉnh / cập nhật

  /**
   * Danh sách thay đổi:
   * Array of {
   *   type: 'CREATE' | 'UPDATE' | 'DELETE',
   *   profileId?: number,
   *   oldData?: Partial<RiskProfile>,
   *   newData: Partial<RiskProfile>
   * }
   */
  @Column({ type: 'jsonb' })
  changes: any[];

  // Người tạo đề xuất
  @Column({ nullable: true })
  createdByUserId: number;

  @Column({ nullable: true })
  createdByName: string;

  // ===== Phê duyệt Cấp 1 (Lãnh đạo Phòng) =====
  @Column({ nullable: true })
  reviewerL1Id: number;

  @Column({ nullable: true })
  reviewerL1Name: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewedL1At: Date;

  @Column({ type: 'text', nullable: true })
  reviewerL1Notes: string;

  // ===== Phê duyệt Cấp 2 (Lãnh đạo Khối KTNB / CAE) =====
  @Column({ nullable: true })
  approverL2Id: number;

  @Column({ nullable: true })
  approverL2Name: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedL2At: Date;

  @Column({ type: 'text', nullable: true })
  approverL2Notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
