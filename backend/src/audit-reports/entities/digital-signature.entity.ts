import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { AuditReport } from './audit-report.entity';

@Entity('digital_signatures')
export class DigitalSignature {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  reportId: number;

  @OneToOne(() => AuditReport, (report) => report.signature, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reportId' })
  report: AuditReport;

  @Column({ type: 'varchar', length: 255 })
  signedBy: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  certificateSerial: string;

  @Column({ type: 'text' })
  reportHash: string;

  @Column({ type: 'text' })
  signatureValue: string;

  @CreateDateColumn()
  signedAt: Date;
}
