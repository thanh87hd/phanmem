import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { WorkflowStep } from './workflow-step.entity';

@Entity('workflow_definitions')
export class WorkflowDefinition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  entityType: string; // 'AuditFinding', 'AuditEngagement', 'Recommendation'

  @Column()
  name: string; // Tên quy trình (VD: Quy trình duyệt phát hiện chuẩn)

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => WorkflowStep, (step) => step.workflow)
  steps: WorkflowStep[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
