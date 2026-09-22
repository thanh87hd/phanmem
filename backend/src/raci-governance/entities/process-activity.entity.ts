import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['activityId'], { unique: true })
@Index(['processId'])
@Entity('process_activities')
export class ProcessActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'activityId', type: 'varchar', length: 50, unique: true })
  activityId: string;

  @Column({ name: 'processId', type: 'varchar', length: 50 })
  processId: string;

  @Column({ name: 'stepNo', type: 'int', default: 1 })
  stepNo: number;

  @Column({ name: 'activityName', type: 'varchar', length: 255 })
  activityName: string;

  @Column({
    name: 'activityType',
    type: 'varchar',
    length: 50,
    default: 'Execution',
  })
  activityType: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;

  @Column({ name: 'inputDesc', type: 'text', nullable: true })
  inputDesc: string;

  @Column({ name: 'outputDesc', type: 'text', nullable: true })
  outputDesc: string;

  @Column({
    name: 'decisionAuthority',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  decisionAuthority: string;

  @Column({ name: 'sla', type: 'varchar', length: 100, nullable: true })
  sla: string;

  @Column({ name: 'keyControl', type: 'text', nullable: true })
  keyControl: string;

  @Column({
    name: 'criticality',
    type: 'varchar',
    length: 50,
    default: 'Medium',
  })
  criticality: string;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'Active' })
  status: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
