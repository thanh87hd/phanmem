import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ResourceData } from './resource-data.entity';

@Entity('framework_resource_metadata')
export class ResourceMetadata {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  resourceName: string; // e.g., 'AuditFinding', 'ExpenseReport'

  @Column()
  displayName: string;

  @Column({ type: 'jsonb', nullable: true })
  schema: any; // JSON Schema for UI and validation

  @Column({ type: 'jsonb', nullable: true })
  uiSchema: any; // UI-specific configuration

  @Column({ type: 'jsonb', nullable: true })
  permissions: any; // RBAC configuration

  @OneToMany(() => ResourceData, (data) => data.metadata)
  dataRecords: ResourceData[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
