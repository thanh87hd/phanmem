import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['assignmentId'], { unique: true })
@Index(['activityId'])
@Index(['roleId'])
@Entity('raci_assignments')
export class RaciAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'assignmentId', type: 'varchar', length: 50, unique: true })
  assignmentId: string;

  @Column({ name: 'processId', type: 'varchar', length: 50 })
  processId: string;

  @Column({ name: 'activityId', type: 'varchar', length: 50 })
  activityId: string;

  @Column({
    name: 'activityName',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  activityName: string;

  @Column({ name: 'roleId', type: 'varchar', length: 50 })
  roleId: string;

  @Column({ name: 'roleName', type: 'varchar', length: 100 })
  roleName: string;

  @Column({ name: 'raciCode', type: 'varchar', length: 5 }) // 'R', 'A', 'C', 'I'
  raciCode: string;

  @Column({ name: 'responsibilityScope', type: 'text', nullable: true })
  responsibilityScope: string;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'Active' })
  status: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
