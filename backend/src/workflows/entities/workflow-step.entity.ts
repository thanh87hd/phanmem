import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WorkflowDefinition } from './workflow-definition.entity';

@Entity('workflow_steps')
export class WorkflowStep {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => WorkflowDefinition, (wf) => wf.steps, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workflowId' })
  workflow: WorkflowDefinition;

  @Column()
  workflowId: number;

  @Column()
  stepName: string; // VD: 'Chờ duyệt cấp 1', 'Đã duyệt'

  @Column()
  statusValue: string; // Giá trị lưu vào DB (VD: 'Pending_L1', 'Approved')

  @Column()
  requiredRole: string; // Role được quyền duyệt (VD: 'Trưởng Ban KTNB', 'Admin')

  @Column({ default: 0 })
  order: number; // Thứ tự bước (1, 2, 3...)

  @Column({ default: false })
  isFinal: boolean; // Đánh dấu đây là bước cuối cùng (Approved/Closed)
}
