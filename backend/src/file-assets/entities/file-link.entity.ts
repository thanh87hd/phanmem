import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { FileAsset } from './file-asset.entity';
import { EvidenceVerification } from './evidence-verification.entity';

@Entity('file_links')
export class FileLink {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  fileAssetId: number;

  @Column({ type: 'varchar', length: 100 })
  ownerType: string;

  @Column({ type: 'int' })
  ownerId: number;

  @Column({ type: 'varchar', length: 50, default: 'attachment' })
  relationType: string;

  @Column({ type: 'text', nullable: true })
  caption: string;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => FileAsset, (asset) => asset.links, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fileAssetId' })
  fileAsset?: FileAsset;

  @OneToMany(() => EvidenceVerification, (ev) => ev.fileLink)
  verifications?: EvidenceVerification[];
}
