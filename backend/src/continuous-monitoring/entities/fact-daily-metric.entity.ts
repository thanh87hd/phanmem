import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('fact_daily_metrics')
@Index(['branchCode', 'metricDate'], { unique: true })
export class FactDailyMetric {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  metricDate: Date;

  @Column()
  branchCode: string;

  // Capital Adequacy
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  carRatio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  cet1Ratio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  tier1Ratio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  equityToAssetsRatio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  leverageRatio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  rwaGrowthRatio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  equityGrowthRatio: number;

  // Asset Quality
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  nplRatio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  group2Ratio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  group2GrowthMom: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  llrRatio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  costOfCreditRatio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  plannedCostOfCreditRatio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  loanToAssetsRatio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  creditGrowthRatio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  creditRoomRatio: number;

  // Management
  @Column({ nullable: true })
  camelsRating: string;

  @Column({ type: 'int', default: 0 })
  remediationOverdueDays: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  amlFraudAlertGrowth: number;

  // Earnings
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  roaRatio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  roeRatio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  nimRatio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  cirRatio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  accruedInterestRatio: number;

  // Liquidity
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  ldrRatio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  liquidity30DaysRatio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  liquidityReserveRatio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  shortTermToMidLongTermRatio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  casaRatio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  creditDepositGap: number;

  // Sensitivity
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  bdsExposureRatio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  tpdnBdsRatio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  singleBorrowerCapitalRatio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  relatedGroupCapitalRatio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  nopRatio: number;

  // Earnings Breakdown Details (Billion VND)
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  netInterestIncome: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  nonInterestIncome: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  operatingExpense: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  provisionExpense: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  profitBeforeTax: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  accruedInterestGrowth: number;

  @Column({ nullable: true })
  unitName: string;

  @CreateDateColumn()
  createdAt: Date;
}
