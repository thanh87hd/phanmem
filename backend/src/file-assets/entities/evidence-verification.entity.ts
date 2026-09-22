import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FileLink } from './file-link.entity';

@Entity('evidence_verifications')
export class EvidenceVerification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  fileLinkId: number;

  @Column({ type: 'varchar', length: 50, default: 'Pending' })
  status: string; // 'Pending' | 'Verified' | 'Rejected' | 'Unverified'

  @Column({ type: 'text', nullable: true })
  result: string;

  @Column({ type: 'int', nullable: true })
  verifiedById: number;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => FileLink, (link) => link.verifications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'fileLinkId' })
  fileLink?: FileLink;
}
