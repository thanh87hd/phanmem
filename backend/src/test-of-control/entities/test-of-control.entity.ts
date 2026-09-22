import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ControlException } from './control-exception.entity';

@Index(['testId'], { unique: true })
@Index(['engagementId'])
@Index(['riskId'])
@Entity('tests_of_control')
export class TestOfControl {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'testId', type: 'varchar', length: 50, unique: true })
  testId: string;

  @Column({ name: 'engagementId', type: 'varchar', length: 50, nullable: true })
  engagementId: string;

  @Column({
    name: 'auditObjectId',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  auditObjectId: string;

  @Column({ name: 'riskId', type: 'varchar', length: 50, nullable: true })
  riskId: string;

  @Column({ name: 'rcmId', type: 'varchar', length: 50, nullable: true })
  rcmId: string;

  @Column({ name: 'controlId', type: 'varchar', length: 50, nullable: true })
  controlId: string;

  @Column({ name: 'controlDescription', type: 'text', nullable: true })
  controlDescription: string;

  @Column({ name: 'keyControl', type: 'varchar', length: 5, default: 'Y' })
  keyControl: string;

  @Column({
    name: 'controlOwner',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  controlOwner: string;

  @Column({
    name: 'controlFrequency',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  controlFrequency: string;

  @Column({ name: 'testPhase', type: 'varchar', length: 50, default: 'Both' })
  testPhase: string;

  @Column({ name: 'testObjective', type: 'text', nullable: true })
  testObjective: string;

  @Column({ name: 'assertion', type: 'text', nullable: true })
  assertion: string;

  @Column({ name: 'criteria', type: 'text', nullable: true })
  criteria: string;

  @Column({ name: 'testMethod', type: 'varchar', length: 100, nullable: true })
  testMethod: string;

  @Column({ name: 'dataSource', type: 'varchar', length: 255, nullable: true })
  dataSource: string;

  @Column({ name: 'populationDefinition', type: 'text', nullable: true })
  populationDefinition: string;

  @Column({
    name: 'populationPeriodFrom',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  populationPeriodFrom: string;

  @Column({
    name: 'populationPeriodTo',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  populationPeriodTo: string;

  @Column({ name: 'populationSize', type: 'int', default: 0 })
  populationSize: number;

  @Column({
    name: 'completenessChecked',
    type: 'varchar',
    length: 5,
    default: 'Y',
  })
  completenessChecked: string;

  @Column({ name: 'accuracyChecked', type: 'varchar', length: 5, default: 'Y' })
  accuracyChecked: string;

  @Column({
    name: 'samplingMethod',
    type: 'varchar',
    length: 50,
    default: 'Statistical',
  })
  samplingMethod: string;

  @Column({ name: 'sampleRationale', type: 'text', nullable: true })
  sampleRationale: string;

  @Column({ name: 'plannedSampleSize', type: 'int', default: 0 })
  plannedSampleSize: number;

  @Column({ name: 'actualSampleSize', type: 'int', default: 0 })
  actualSampleSize: number;

  @Column({ name: 'itemsTested', type: 'int', default: 0 })
  itemsTested: number;

  @Column({ name: 'validExceptions', type: 'int', default: 0 })
  validExceptions: number;

  @Column({ name: 'falsePositives', type: 'int', default: 0 })
  falsePositives: number;

  @Column({ name: 'dataIssues', type: 'int', default: 0 })
  dataIssues: number;

  @Column({ name: 'exceptionRate', type: 'double precision', default: 0 })
  exceptionRate: number;

  @Column({ name: 'tolerableRate', type: 'double precision', default: 0.05 })
  tolerableRate: number;

  @Column({
    name: 'materialException',
    type: 'varchar',
    length: 5,
    default: 'N',
  })
  materialException: string;

  @Column({
    name: 'pervasiveException',
    type: 'varchar',
    length: 5,
    default: 'N',
  })
  pervasiveException: string;

  @Column({
    name: 'suggestedResult',
    type: 'varchar',
    length: 20,
    default: 'Pass',
  })
  suggestedResult: string;

  @Column({ name: 'finalResult', type: 'varchar', length: 20, default: 'Pass' })
  finalResult: string;

  @Column({ name: 'overrideRationale', type: 'text', nullable: true })
  overrideRationale: string;

  @Column({ name: 'exceptionSummary', type: 'text', nullable: true })
  exceptionSummary: string;

  @Column({ name: 'rootCauseAssessment', type: 'text', nullable: true })
  rootCauseAssessment: string;

  @Column({ name: 'riskImpactAssessment', type: 'text', nullable: true })
  riskImpactAssessment: string;

  @Column({ name: 'issueRequired', type: 'varchar', length: 5, default: 'N' })
  issueRequired: string;

  @Column({ name: 'issueId', type: 'varchar', length: 50, nullable: true })
  issueId: string;

  @Column({ name: 'evidenceReferences', type: 'text', nullable: true })
  evidenceReferences: string;

  @Column({ name: 'preparedBy', type: 'varchar', length: 100, nullable: true })
  preparedBy: string;

  @Column({ name: 'preparedDate', type: 'varchar', length: 50, nullable: true })
  preparedDate: string;

  @Column({ name: 'reviewedBy', type: 'varchar', length: 100, nullable: true })
  reviewedBy: string;

  @Column({ name: 'reviewedDate', type: 'varchar', length: 50, nullable: true })
  reviewedDate: string;

  @Column({ name: 'reviewNotes', type: 'text', nullable: true })
  reviewNotes: string;

  @Column({ name: 'testStatus', type: 'varchar', length: 50, default: 'Draft' })
  testStatus: string;

  @Column({ name: 'qaFlag', type: 'varchar', length: 50, nullable: true })
  qaFlag: string;

  @OneToMany(() => ControlException, (exc) => exc.test)
  exceptions: ControlException[];

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
