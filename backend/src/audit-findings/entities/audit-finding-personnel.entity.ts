import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { AuditFinding } from './audit-finding.entity';

@Entity('audit_finding_personnel')
export class AuditFindingPersonnel {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => AuditFinding, (finding) => finding.personnel, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'findingId' })
  finding: AuditFinding;

  @Column()
  findingId: number;

  @Column()
  fullName: string; // Họ và tên

  @Column({ nullable: true })
  titleAtViolation: string; // Chức danh tại thời điểm vi phạm

  @Column({ nullable: true })
  violationRole: string; // Vi phạm ghi nhận (Thẩm định/Phê duyệt/Đề xuất...)

  @Column({ nullable: true })
  responsibilityLevel: string; // Vai trò (Chính / Người liên quan)

  @CreateDateColumn()
  createdAt: Date;
}
