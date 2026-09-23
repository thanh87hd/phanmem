import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  passwordHash: string;

  @Column()
  fullName: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  jobTitle: string; // Chức danh: Trưởng đoàn, KTV, QA...

  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @Column({ nullable: true })
  roleId: number;

  @Column({ nullable: true })
  department: string;

  @Column({ nullable: true })
  position: string;

  @Column({ nullable: true })
  teamCode: string; // PKT_HoiSo | PKT_DVKD | TongHop

  @Column({ nullable: true })
  employeeId: string;

  @Column({ nullable: true })
  workplace: string; // Nơi làm việc / Khu vực (MB, MN)

  @Column({ nullable: true })
  startDate: string; // Ngày vào KTNB

  @Column({ nullable: true })
  birthDate: string; // Ngày sinh

  @Column({ nullable: true })
  landlinePhone: string; // SĐT Cố định

  @Column({ type: 'jsonb', nullable: true })
  priorDepartments: string[] | string | null; // Đơn vị công tác trước khi sang KTNB (jsonb array)

  @Column({ nullable: true })
  coolingOffEndDate: string; // Thời hạn cách ly độc lập (Cooling-off date: YYYY-MM-DD)

  @Column({ default: true })
  isActive: boolean;

  // === Vòng đời nhân sự (User Lifecycle Management) ===
  @Column({ default: 'Active' })
  status: string; // 'Active' | 'Resigned' | 'Transferred' | 'Suspended'

  @Column({ nullable: true })
  resignationDate: string; // Ngày nghỉ việc (YYYY-MM-DD)

  @Column({ nullable: true })
  transferDate: string; // Ngày điều chuyển (YYYY-MM-DD)

  @Column({ nullable: true })
  transferDestination: string; // Đơn vị chuyển đến

  @Column({ type: 'text', nullable: true })
  statusReason: string; // Lý do chuyển/nghỉ hoặc biên bản bàn giao

  @Column({ type: 'timestamp', nullable: true })
  statusUpdatedAt: Date; // Thời điểm cập nhật trạng thái gần nhất

  // === Password Policy (PCI DSS 8.3) ===
  @Column({ default: false })
  mustChangePassword: boolean; // Force change on first login

  @Column({ type: 'timestamp', nullable: true })
  passwordChangedAt: Date; // For 90-day expiry tracking

  @Column({ default: 0 })
  failedLoginAttempts: number; // Lockout after N failed attempts

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil: Date; // Account lock expiry

  // === Phase 2: Enhanced Password Management ===
  @Column({ type: 'text', nullable: true })
  passwordHistory: string; // JSON array of hashed previous passwords (PCI DSS 8.3.7)

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date; // Last successful login timestamp

  @Column({ nullable: true })
  lastLoginIp: string; // IP of last successful login

  @Column({ nullable: true })
  passwordResetToken: string; // Temporary token for password reset

  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpires: Date; // Expiry of reset token

  @Column({ default: false })
  twoFactorEnabled: boolean; // Prep for 2FA (PCI DSS 8.4)

  @Column({ nullable: true })
  twoFactorSecret: string; // Secret key for 2FA

  @Column({ nullable: true })
  twoFactorTempSecret: string; // Temporary secret key during setup

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  customFields: Record<string, any>;
}
