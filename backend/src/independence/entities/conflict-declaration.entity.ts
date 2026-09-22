import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('conflict_declarations')
export class ConflictDeclaration {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auditorId' })
  auditor: User;

  @Column()
  auditorId: number;

  @Column()
  year: number;

  @Column({ type: 'boolean', default: false })
  hasConflict: boolean;

  @Column({ type: 'text', nullable: true })
  details: string; // Chi tiết về mối quan hệ gia đình, lợi ích tài chính với ĐVĐKT...

  // ===== IIA Standard 1.2: CAE Approval for Conflict Exceptions =====
  @Column({ default: 'None' })
  caeApprovalStatus: string; // None | Pending | Approved | Rejected

  @Column({ nullable: true })
  caeApprovedById: number;

  @Column({ nullable: true })
  caeApprovedByName: string;

  @Column({ type: 'timestamp', nullable: true })
  caeApprovedAt: Date;

  @Column({ type: 'text', nullable: true })
  caeNotes: string; // Biện pháp kiểm soát giảm thiểu (mitigating controls) hoặc lý do phê duyệt
  // ===== End CAE Approval =====

  @CreateDateColumn()
  declaredAt: Date;
}
