import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Index(['resource', 'resourceId'])
@Index(['userId'])
@Index(['createdAt'])
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  action: string; // 'CREATE' | 'UPDATE' | 'DELETE'

  @Column()
  resource: string; // e.g. 'audit-findings', 'recommendations'

  @Column({ nullable: true })
  resourceId: string;

  @Column({ nullable: true })
  userId: number;

  @Column({ nullable: true })
  username: string;

  @Column({ type: 'text', nullable: true })
  oldValue: string; // JSON stringified

  @Column({ type: 'text', nullable: true })
  newValue: string; // JSON stringified

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  /**
   * SHA-256 (hex, 64 ký tự) trên dạng chuẩn tắc của các trường bất biến do phía gọi
   * cung cấp — UAT TC-SYS-05 yêu cầu mọi bản ghi nhật ký phải có mã băm để chống sửa.
   * Nullable vì các bản ghi cũ (trước migration) không có mã băm; xem
   * `audit-log-integrity.util.ts` để biết dạng chuẩn tắc và phạm vi bảo vệ.
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  hash: string;

  @CreateDateColumn()
  createdAt: Date;
}
