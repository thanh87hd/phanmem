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
import { TestOfControl } from './test-of-control.entity';

@Index(['exceptionId'], { unique: true })
@Index(['testId'])
@Index(['issueId'])
@Entity('control_exceptions')
export class ControlException {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'exceptionId', type: 'varchar', length: 50, unique: true })
  exceptionId: string;

  @Column({ name: 'testId', type: 'varchar', length: 50 })
  testId: string;

  @ManyToOne(() => TestOfControl, (t) => t.exceptions, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'testId', referencedColumnName: 'testId' })
  test: TestOfControl;

  @Column({
    name: 'sampleItemId',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  sampleItemId: string;

  @Column({
    name: 'transactionDate',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  transactionDate: string;

  @Column({ name: 'unitBranch', type: 'varchar', length: 100, nullable: true })
  unitBranch: string;

  @Column({ name: 'exceptionDescription', type: 'text', nullable: true })
  exceptionDescription: string;

  @Column({ name: 'criteriaBreached', type: 'text', nullable: true })
  criteriaBreached: string;

  @Column({
    name: 'exceptionType',
    type: 'varchar',
    length: 50,
    default: 'Valid',
  })
  exceptionType: string;

  @Column({
    name: 'financialExposure',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
  })
  financialExposure: number;

  @Column({ name: 'customerImpact', type: 'varchar', length: 5, default: 'N' })
  customerImpact: string;

  @Column({
    name: 'regulatoryImpact',
    type: 'varchar',
    length: 5,
    default: 'N',
  })
  regulatoryImpact: string;

  @Column({ name: 'managementExplanation', type: 'text', nullable: true })
  managementExplanation: string;

  @Column({ name: 'auditorValidation', type: 'text', nullable: true })
  auditorValidation: string;

  @Column({
    name: 'rootCauseCode',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  rootCauseCode: string;

  @Column({ name: 'riskImpact', type: 'text', nullable: true })
  riskImpact: string;

  @Column({ name: 'validException', type: 'varchar', length: 5, default: 'Y' })
  validException: string;

  @Column({ name: 'issueId', type: 'varchar', length: 50, nullable: true })
  issueId: string;

  @Column({ name: 'evidenceRef', type: 'varchar', length: 255, nullable: true })
  evidenceRef: string;

  @Column({ name: 'preparedBy', type: 'varchar', length: 100, nullable: true })
  preparedBy: string;

  @Column({
    name: 'reviewStatus',
    type: 'varchar',
    length: 50,
    default: 'Draft',
  })
  reviewStatus: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
