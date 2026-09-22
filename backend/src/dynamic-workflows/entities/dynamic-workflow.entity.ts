import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('dynamic_workflows')
export class DynamicWorkflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  triggerResource: string;

  @Column()
  triggerEvent: string;

  @Column({ type: 'jsonb', default: [] })
  nodes: any;

  @Column({ type: 'jsonb', default: [] })
  edges: any;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
