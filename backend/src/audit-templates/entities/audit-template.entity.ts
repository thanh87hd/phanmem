import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('audit_templates')
export class AuditTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  domain: string; // Credit, AML, IT, Operational

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'json' })
  checklist: any;

  @Column({ default: '1.0' })
  version: string;

  @Column({ default: 'Published' })
  status: string; // Draft, Published, Archived

  @Column({ nullable: true })
  createdBy: string;

  @Column({ default: 0 })
  usageCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  @Column({ nullable: true })
  targetDepartments: string;

  @Column({ type: 'int', default: 40 })
  estimatedHours: number;

  @Column({ nullable: true })
  iiaStandards: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
