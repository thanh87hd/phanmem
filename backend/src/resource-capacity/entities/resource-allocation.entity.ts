import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['allocationId'], { unique: true })
@Index(['staffId'])
@Index(['demandId'])
@Entity('resource_allocations')
export class ResourceAllocation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'allocationId', type: 'varchar', length: 50, unique: true })
  allocationId: string;

  @Column({ name: 'demandId', type: 'varchar', length: 50 })
  demandId: string;

  @Column({ name: 'planItemId', type: 'varchar', length: 50, nullable: true })
  planItemId: string;

  @Column({ name: 'staffId', type: 'varchar', length: 50 })
  staffId: string;

  @Column({ name: 'staffName', type: 'varchar', length: 100 })
  staffName: string;

  @Column({ name: 'quarter', type: 'varchar', length: 10, default: 'Q1' })
  quarter: string;

  @Column({ name: 'role', type: 'varchar', length: 50, nullable: true })
  role: string;

  @Column({
    name: 'assignedSkill',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  assignedSkill: string;

  @Column({ name: 'allocatedHours', type: 'int', default: 100 })
  allocatedHours: number;

  @Column({ name: 'overlapConflict', type: 'boolean', default: false })
  overlapConflict: boolean;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'Allocated' })
  status: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
