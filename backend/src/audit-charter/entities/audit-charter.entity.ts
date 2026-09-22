import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('audit_charters')
export class AuditCharter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string; // VD: "Điều lệ Kiểm toán Nội bộ LPBank 2026"

  @Column({ default: '1' })
  version: string; // Phiên bản dạng chuỗi: "1", "2", "v2026.1"...

  @Column({ type: 'text', nullable: true })
  content: string; // Toàn văn nội dung Điều lệ (Markdown / Text thuần)

  @Column({ type: 'text', nullable: true })
  purpose: string; // Mục đích hoạt động KTNB

  @Column({ type: 'text', nullable: true })
  authority: string; // Thẩm quyền: quyền truy cập hồ sơ, tài sản, nhân sự...

  @Column({ type: 'text', nullable: true })
  responsibility: string; // Trách nhiệm: phạm vi kiểm toán, báo cáo, tư vấn...

  @Column({ type: 'text', nullable: true })
  scope: string; // Phạm vi hoạt động

  @Column({ type: 'text', nullable: true })
  reportingLine: string; // Tuyến báo cáo: CAE → BKS / HĐQT

  @Column({ type: 'text', nullable: true })
  independenceStatement: string; // Cam kết độc lập & khách quan

  @Column({ type: 'text', nullable: true })
  standardsConformance: string; // Tuyên bố tuân thủ IIA IPPF

  @Column({ default: 'Draft' })
  status: string; // Draft | PendingApproval | Approved | Expired | Superseded

  // Người soạn thảo (CAE / Trưởng Ban KTNB)
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'draftedById' })
  draftedByUser?: User;

  @Column({ nullable: true })
  draftedById: number;

  @Column({ nullable: true })
  draftedByName: string;

  // Người/Hội đồng phê duyệt
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approvedById' })
  approvedByUser?: User;

  @Column({ nullable: true })
  approvedById: number;

  @Column({ nullable: true })
  approvedByName: string;

  @Column({ nullable: true })
  approvedBy: string; // Tên hiển thị người duyệt / Ban bệ phê duyệt (VD: "Ban Kiểm Soát", "HĐQT", username)

  @Column({ nullable: true })
  approvalBody: string; // HDQT | BKS | TGD

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'date', nullable: true })
  effectiveDate: string; // Ngày có hiệu lực

  @Column({ type: 'date', nullable: true })
  expiryDate: string; // Ngày hết hiệu lực (thường review hàng năm)

  @Column({ type: 'date', nullable: true })
  nextReviewDate: string; // Ngày review tiếp theo

  @Column({ type: 'text', nullable: true })
  approvalNotes: string; // Ghi chú phê duyệt

  @Column({ type: 'jsonb', nullable: true })
  revisionHistory: {
    version: string;
    action: 'DRAFT' | 'SUBMIT' | 'APPROVE' | 'REJECT' | 'EXPIRE';
    actorId?: number;
    actorName: string;
    role?: string;
    timestamp: string;
    notes: string;
  }[];

  @Column({ nullable: true })
  documentUrl: string; // Link file PDF/Word gốc (nếu có)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
