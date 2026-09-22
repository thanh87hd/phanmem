import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['scenarioId'], { unique: true })
@Entity('scenario_registers')
export class ScenarioRegister {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'scenarioId', type: 'varchar', length: 50, unique: true })
  scenarioId: string;

  @Column({ name: 'scenarioName', type: 'varchar', length: 255 })
  scenarioName: string;

  @Column({
    name: 'scenarioType',
    type: 'varchar',
    length: 50,
    default: 'Baseline',
  })
  scenarioType: string;

  @Column({
    name: 'horizon',
    type: 'varchar',
    length: 50,
    default: 'Short-term',
  })
  horizon: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;

  @Column({ name: 'keyAssumptions', type: 'text', nullable: true })
  keyAssumptions: string;

  @Column({ name: 'triggerIndicators', type: 'text', nullable: true })
  triggerIndicators: string;

  @Column({ name: 'probabilityPct', type: 'double precision', default: 0.5 })
  probabilityPct: number;

  @Column({ name: 'severity', type: 'int', default: 2 })
  severity: number;

  @Column({ name: 'affectedDomains', type: 'text', nullable: true })
  affectedDomains: string;

  @Column({
    name: 'scenarioOwner',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  scenarioOwner: string;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'Active' })
  status: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
