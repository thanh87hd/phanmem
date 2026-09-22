import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('audit_schedules')
export class AuditSchedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ nullable: true })
  userName: string;

  @Column({ nullable: true })
  engagementId: number;

  @Column({ nullable: true })
  engagementName: string;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ nullable: true })
  location: string; // Hội sở | Tên chi nhánh | Remote | Khác

  @Column({ default: false })
  travelRequired: boolean;

  @Column({ default: 'Planned' })
  status: string; // Planned | Confirmed | InProgress | Completed | Cancelled | Proposed

  @Column({ nullable: true })
  role: string; // Trưởng đoàn | Thành viên | Dự phòng | vv.

  @Column({ default: false })
  isBackup: boolean;

  @Column({ nullable: true })
  teamCode: string; // PKT_HoiSo | PKT_DVKD | TongHop

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
