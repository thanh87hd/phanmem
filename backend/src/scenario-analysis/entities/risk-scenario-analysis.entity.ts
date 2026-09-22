import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['analysisId'], { unique: true })
@Index(['scenarioId'])
@Index(['riskId'])
@Entity('risk_scenario_analyses')
export class RiskScenarioAnalysis {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'analysisId', type: 'varchar', length: 50, unique: true })
  analysisId: string;

  @Column({ name: 'scenarioId', type: 'varchar', length: 50 })
  scenarioId: string;

  @Column({ name: 'riskId', type: 'varchar', length: 50 })
  riskId: string;

  @Column({
    name: 'auditObjectId',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  auditObjectId: string;

  @Column({ name: 'riskName', type: 'varchar', length: 255 })
  riskName: string;

  @Column({ name: 'riskDomain', type: 'varchar', length: 50, nullable: true })
  riskDomain: string;

  @Column({ name: 'riskOwner', type: 'varchar', length: 100, nullable: true })
  riskOwner: string;

  @Column({ name: 'materialityExposure', type: 'double precision', default: 0 })
  materialityExposure: number;

  @Column({ name: 'baseImpact', type: 'double precision', default: 2 })
  baseImpact: number;

  @Column({ name: 'baseLikelihood', type: 'double precision', default: 2 })
  baseLikelihood: number;

  @Column({ name: 'baseResidualScore', type: 'double precision', default: 4 })
  baseResidualScore: number;

  @Column({ name: 'scenarioImpact', type: 'double precision', default: 3 })
  scenarioImpact: number;

  @Column({ name: 'scenarioLikelihood', type: 'double precision', default: 3 })
  scenarioLikelihood: number;

  @Column({
    name: 'scenarioResidualScore',
    type: 'double precision',
    default: 9,
  })
  scenarioResidualScore: number;

  @Column({ name: 'deltaResidual', type: 'double precision', default: 5 })
  deltaResidual: number;

  @Column({
    name: 'riskTrajectory',
    type: 'varchar',
    length: 50,
    default: 'Stable',
  })
  riskTrajectory: string;

  @Column({ name: 'appetiteThreshold', type: 'double precision', default: 12 })
  appetiteThreshold: number;

  @Column({ name: 'isAboveAppetite', type: 'boolean', default: false })
  isAboveAppetite: boolean;

  @Column({ name: 'finalBand', type: 'varchar', length: 50, default: 'Medium' })
  finalBand: string;

  @Column({
    name: 'auditResponse',
    type: 'varchar',
    length: 100,
    default: 'Monitor KRI',
  })
  auditResponse: string;

  @Column({
    name: 'annualPlanImpact',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  annualPlanImpact: string;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'Active' })
  status: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
