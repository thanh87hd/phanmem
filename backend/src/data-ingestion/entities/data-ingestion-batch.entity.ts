import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum IngestionStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum IngestionSource {
  CORE_BANKING = 'CORE_BANKING',
  HRM = 'HRM',
  GL_TRANSACTIONS = 'GL_TRANSACTIONS',
  FILE_DROP_EXCEL = 'FILE_DROP_EXCEL',
  FILE_DROP_CSV = 'FILE_DROP_CSV',
  API_PUSH = 'API_PUSH',
  MANUAL_UPLOAD = 'MANUAL_UPLOAD',
}

@Entity('data_ingestion_batches')
export class DataIngestionBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 64 })
  batchCode: string;

  @Column({
    type: 'enum',
    enum: IngestionSource,
    default: IngestionSource.MANUAL_UPLOAD,
  })
  dataSource: IngestionSource;

  @Column({ type: 'date', nullable: true })
  periodDate: string;

  @Column({ length: 255 })
  fileName: string;

  @Column({ length: 500, nullable: true })
  rawFilePath: string;

  @Index()
  @Column({ length: 64, nullable: true })
  fileHash: string;

  @Column({ type: 'int', default: 0 })
  recordCount: number;

  @Column({ type: 'int', default: 0 })
  successCount: number;

  @Column({ type: 'int', default: 0 })
  errorCount: number;

  @Index()
  @Column({
    type: 'enum',
    enum: IngestionStatus,
    default: IngestionStatus.QUEUED,
  })
  status: IngestionStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  errorLog: string;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ length: 100, default: 'SYSTEM' })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
