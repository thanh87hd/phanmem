import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ResourceMetadata } from './resource-metadata.entity';

@Entity('framework_resource_data')
export class ResourceData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ResourceMetadata, (metadata) => metadata.dataRecords, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'metadataId' })
  metadata: ResourceMetadata;

  @Column()
  metadataId: number;

  @Column({ type: 'jsonb' })
  data: Record<string, any>; // The actual dynamic data

  @Column({ nullable: true })
  createdBy: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
