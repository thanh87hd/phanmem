import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['ratingCode'], { unique: true })
@Index(['engagementId'])
@Entity('audit_ratings')
export class AuditRating {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ratingCode', type: 'varchar', length: 50, unique: true })
  ratingCode: string;

  @Column({ name: 'engagementId', type: 'varchar', length: 50, nullable: true })
  engagementId: string;

  @Column({
    name: 'auditObjectId',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  auditObjectId: string;

  @Column({
    name: 'engagementTitle',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  engagementTitle: string;

  @Column({
    name: 'auditType',
    type: 'varchar',
    length: 50,
    default: 'Assurance',
  })
  auditType: string;

  @Column({ name: 'coverageGapPct', type: 'double precision', default: 0 })
  coverageGapPct: number;

  @Column({ name: 'residualRiskScore', type: 'double precision', default: 2.0 })
  residualRiskScore: number;

  @Column({
    name: 'controlEffectivenessScore',
    type: 'double precision',
    default: 2.0,
  })
  controlEffectivenessScore: number;

  @Column({ name: 'criticalIssuesCount', type: 'int', default: 0 })
  criticalIssuesCount: number;

  @Column({ name: 'highIssuesCount', type: 'int', default: 0 })
  highIssuesCount: number;

  @Column({ name: 'moderateIssuesCount', type: 'int', default: 0 })
  moderateIssuesCount: number;

  @Column({ name: 'lowIssuesCount', type: 'int', default: 0 })
  lowIssuesCount: number;

  @Column({
    name: 'issueSeverityScore',
    type: 'double precision',
    default: 2.0,
  })
  issueSeverityScore: number;

  @Column({
    name: 'managementResponseScore',
    type: 'double precision',
    default: 2.0,
  })
  managementResponseScore: number;

  @Column({
    name: 'scopeLimitation',
    type: 'varchar',
    length: 50,
    default: 'None',
  })
  scopeLimitation: string;

  @Column({ name: 'baseWeightedScore', type: 'double precision', default: 2.0 })
  baseWeightedScore: number;

  @Column({ name: 'calculatedRating', type: 'varchar', length: 50 })
  calculatedRating: string;

  @Column({
    name: 'decisionRuleRating',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  decisionRuleRating: string;

  @Column({ name: 'decisionRuleRationale', type: 'text', nullable: true })
  decisionRuleRationale: string;

  @Column({ name: 'finalRating', type: 'varchar', length: 50 })
  finalRating: string;

  @Column({ name: 'overrideRationale', type: 'text', nullable: true })
  overrideRationale: string;

  @Column({ name: 'overallConclusion', type: 'text', nullable: true })
  overallConclusion: string;

  @Column({ name: 'keyStrengths', type: 'text', nullable: true })
  keyStrengths: string;

  @Column({ name: 'keyWeaknesses', type: 'text', nullable: true })
  keyWeaknesses: string;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'Draft' })
  status: string;

  @Column({ name: 'preparedBy', type: 'varchar', length: 100, nullable: true })
  preparedBy: string;

  @Column({ name: 'reviewedBy', type: 'varchar', length: 100, nullable: true })
  reviewedBy: string;

  @Column({ name: 'approvedBy', type: 'varchar', length: 100, nullable: true })
  approvedBy: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
