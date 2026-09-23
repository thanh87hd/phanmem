import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AuditPlanUnit } from '../../audit-plans/entities/audit-plan-unit.entity';

@Index(['demandId'], { unique: true })
@Index(['quarter'])
@Index(['planUnitId'])
@Entity('resource_demands')
export class ResourceDemand {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'demandId', type: 'varchar', length: 50, unique: true })
  demandId: string;

  @ManyToOne(() => AuditPlanUnit, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'planUnitId' })
  planUnit: AuditPlanUnit;

  @Column({ name: 'planUnitId', type: 'int', nullable: true })
  planUnitId: number;

  @Column({ name: 'planItemId', type: 'varchar', length: 50, nullable: true })
  planItemId: string;

  @Column({
    name: 'activityType',
    type: 'varchar',
    length: 50,
    default: 'Audit',
  })
  activityType: string;

  @Column({ name: 'engagementName', type: 'varchar', length: 255 })
  engagementName: string;

  @Column({ name: 'quarter', type: 'varchar', length: 10, default: 'Q1' })
  quarter: string;

  @Column({ name: 'priority', type: 'varchar', length: 50, default: 'High' })
  priority: string;

  @Column({
    name: 'requiredSkill',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  requiredSkill: string;

  @Column({ name: 'minimumSkillLevel', type: 'int', default: 3 })
  minimumSkillLevel: number;

  @Column({
    name: 'requiredGrade',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  requiredGrade: string;

  @Column({ name: 'requiredHours', type: 'int', default: 200 })
  requiredHours: number;

  @Column({ name: 'dataAnalyticsHours', type: 'int', default: 40 })
  dataAnalyticsHours: number;

  @Column({ name: 'mandatory', type: 'varchar', length: 5, default: 'Y' })
  mandatory: string;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'Approved' })
  status: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
