import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['processId'], { unique: true })
@Entity('audit_processes')
export class AuditProcess {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'processId', type: 'varchar', length: 50, unique: true })
  processId: string;

  @Column({ name: 'processName', type: 'varchar', length: 255 })
  processName: string;

  @Column({
    name: 'processType',
    type: 'varchar',
    length: 50,
    default: 'Core Assurance',
  })
  processType: string;

  @Column({ name: 'objective', type: 'text', nullable: true })
  objective: string;

  @Column({ name: 'scope', type: 'text', nullable: true })
  scope: string;

  @Column({
    name: 'processOwner',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  processOwner: string;

  @Column({
    name: 'executiveOwner',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  executiveOwner: string;

  @Column({ name: 'criticality', type: 'varchar', length: 50, default: 'High' })
  criticality: string;

  @Column({ name: 'version', type: 'varchar', length: 20, default: '2.0' })
  version: string;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'Active' })
  status: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
