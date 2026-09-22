import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BacktestStrategy {
  HISTORICAL_REPLAY = 'HISTORICAL_REPLAY',
  WALK_FORWARD = 'WALK_FORWARD',
  MONTE_CARLO = 'MONTE_CARLO',
}

@Entity('kri_backtest_results')
export class KriBacktestResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  ruleCode: string; // VD: CAMELS_A_NPL, EWS_DEBT_MIGRATION, LDR_ALERT

  @Column({ length: 255 })
  ruleName: string;

  @Column({
    type: 'enum',
    enum: BacktestStrategy,
    default: BacktestStrategy.HISTORICAL_REPLAY,
  })
  strategy: BacktestStrategy;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'jsonb' })
  testedThresholds: {
    yellowThreshold: number;
    redThreshold: number;
    comparisonOperator?: string;
  };

  @Column({ type: 'int', default: 0 })
  totalObservations: number;

  // Confusion Matrix Counters
  @Column({ type: 'int', default: 0 })
  truePositives: number; // Dự báo có rủi ro & Thực tế xảy ra nợ xấu/lỗi

  @Column({ type: 'int', default: 0 })
  falsePositives: number; // Báo động giả (Dự báo rủi ro nhưng thực tế bình thường)

  @Column({ type: 'int', default: 0 })
  trueNegatives: number; // Dự báo bình thường & Thực tế an toàn

  @Column({ type: 'int', default: 0 })
  falseNegatives: number; // Bỏ lọt rủi ro (Dự báo an toàn nhưng thực tế phát sinh nợ xấu)

  // Evaluated Metrics
  @Column({ type: 'float', default: 0 })
  hitRateRecall: number; // Recall = TP / (TP + FN)

  @Column({ type: 'float', default: 0 })
  precision: number; // Precision = TP / (TP + FP)

  @Column({ type: 'float', default: 0 })
  falsePositiveRate: number; // FPR = FP / (FP + TN)

  @Column({ type: 'float', default: 0 })
  f1Score: number; // 2 * (Precision * Recall) / (Precision + Recall)

  @Column({ type: 'float', default: 0 })
  aucRoc: number; // Area Under the ROC Curve

  @Column({ type: 'jsonb', nullable: true })
  optimalThresholdRecommendation: {
    recommendedYellow: number;
    recommendedRed: number;
    expectedF1Improvement: number;
    rationale: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  timeSeriesDetails: Array<{
    date: string;
    actualValue: number;
    alertTriggered: boolean;
    actualDefaultOrFinding: boolean;
    isCorrect: boolean;
  }>;

  @Column({ nullable: true })
  executedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
