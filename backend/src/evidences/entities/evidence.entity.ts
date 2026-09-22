import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('evidences')
export class Evidence {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  originalName: string; // Tên file gốc

  @Column()
  storedName: string; // Tên file trên server (UUID)

  @Column()
  mimeType: string;

  @Column()
  size: number; // bytes

  @Column()
  path: string; // Đường dẫn lưu trên server

  // Liên kết đến đối tượng — polymorphic
  @Column({ nullable: true })
  linkedResource: string; // 'recommendations' | 'working-papers' | 'audit-findings'

  @Column({ nullable: true })
  linkedResourceId: number;

  // Metadata
  @Column({ nullable: true })
  uploadedBy: number; // userId

  @Column({ nullable: true })
  uploadedByName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: 'Pending' })
  aiVerificationStatus: string; // Pending | Verified | Rejected | Unverified

  @Column({ type: 'text', nullable: true })
  aiVerificationResult: string; // Trích xuất OCR và đánh giá từ AI

  @Column({ default: 1 })
  version: number;

  @CreateDateColumn()
  uploadedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
