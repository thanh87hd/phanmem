import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['staffId'], { unique: true })
@Index(['department'])
@Entity('staff_rosters')
export class StaffRoster {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'staffId', type: 'varchar', length: 50, unique: true })
  staffId: string;

  @Column({ name: 'fullName', type: 'varchar', length: 100 })
  fullName: string;

  @Column({ name: 'grade', type: 'varchar', length: 50, default: 'Senior' })
  grade: string;

  @Column({ name: 'department', type: 'varchar', length: 100, nullable: true })
  department: string;

  @Column({ name: 'manager', type: 'varchar', length: 100, nullable: true })
  manager: string;

  @Column({
    name: 'employmentStatus',
    type: 'varchar',
    length: 50,
    default: 'Active',
  })
  employmentStatus: string;

  @Column({ name: 'fte', type: 'double precision', default: 1.0 })
  fte: number;

  @Column({ name: 'primarySkill', type: 'varchar', length: 50, nullable: true })
  primarySkill: string;

  @Column({
    name: 'secondarySkills',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  secondarySkills: string;

  @Column({ name: 'skillLevel', type: 'int', default: 3 })
  skillLevel: number;

  @Column({ name: 'dataAnalyticsLevel', type: 'int', default: 2 })
  dataAnalyticsLevel: number;

  @Column({
    name: 'certifications',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  certifications: string;

  @Column({ name: 'location', type: 'varchar', length: 100, default: 'Hội sở' })
  location: string;

  @Column({ name: 'annualStandardHours', type: 'int', default: 1760 })
  annualStandardHours: number;

  @Column({ name: 'plannedLeaveHours', type: 'int', default: 160 })
  plannedLeaveHours: number;

  @Column({ name: 'trainingHours', type: 'int', default: 80 })
  trainingHours: number;

  @Column({ name: 'adminHours', type: 'int', default: 120 })
  adminHours: number;

  @Column({ name: 'qaHours', type: 'int', default: 80 })
  qaHours: number;

  @Column({ name: 'contingencyHours', type: 'int', default: 120 })
  contingencyHours: number;

  @Column({ name: 'netAvailableHours', type: 'int', default: 1200 })
  netAvailableHours: number;

  @Column({ name: 'committedHours', type: 'int', default: 0 })
  committedHours: number;

  @Column({ name: 'remainingCapacity', type: 'int', default: 1200 })
  remainingCapacity: number;

  @Column({ name: 'utilizationPct', type: 'double precision', default: 0 })
  utilizationPct: number;

  @Column({ name: 'skillGapFlag', type: 'varchar', length: 50, nullable: true })
  skillGapFlag: string;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'Active' })
  status: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
