import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  originalName: string;

  @Column({ type: 'varchar', length: 255 })
  storedName: string;

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ type: 'int' })
  size: number;

  @Column({ type: 'text' })
  path: string;

  // Loại tài liệu: 'Template' | 'Report' | 'File' | 'Other'
  @Column({ type: 'varchar', length: 50, default: 'File' })
  documentType: string;

  // Phân loại tùy chỉnh, vd: "Kế hoạch", "Biên bản", "Chính sách"
  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  linkedResource: string;

  @Column({ type: 'int', nullable: true })
  linkedResourceId: number;

  @Column({ type: 'int', nullable: true })
  uploadedBy: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  uploadedByName: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
