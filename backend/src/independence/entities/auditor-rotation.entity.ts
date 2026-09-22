import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('auditor_rotations')
export class AuditorRotation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  auditorName: string;

  @Column()
  departmentName: string;

  @Column({ type: 'date' })
  lastAuditDate: string;

  @Column({ type: 'date' })
  nextAllowedAuditDate: string; // Thường là sau 1-3 năm tùy quy định

  @Column({ type: 'boolean', default: true })
  isRestricted: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
