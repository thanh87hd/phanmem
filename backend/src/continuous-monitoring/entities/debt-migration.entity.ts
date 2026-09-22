import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('debt_migration_records')
@Index(['branchCode', 'periodFrom', 'periodTo'], { unique: true })
export class DebtMigrationRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  branchCode: string;

  @Column({ nullable: true })
  branchName: string;

  @Column({ length: 20 })
  periodFrom: string;

  @Column({ length: 20 })
  periodTo: string;

  // Group 1 Transitions (Billion VND)
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  g1To1: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  g1To2: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  g1To3: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  g1To4: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  g1To5: number;

  // Group 2 Transitions
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  g2To1: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  g2To2: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  g2To3: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  g2To4: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  g2To5: number;

  // Group 3 Transitions
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  g3To1: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  g3To2: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  g3To3: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  g3To4: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  g3To5: number;

  // Group 4 Transitions
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  g4To1: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  g4To2: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  g4To3: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  g4To4: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  g4To5: number;

  // Group 5 Transitions
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  g5To1: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  g5To2: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  g5To3: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  g5To4: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  g5To5: number;

  // Summary Metrics
  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalBeginningBalance: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalEndingBalance: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  g2FormationRate: number; // % G1 moved to G2

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  nplFormationRate: number; // % Non-NPL moved to NPL (G3-5)

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  recoveredAmount: number; // Thu hồi nợ xấu đã xử lý

  @CreateDateColumn()
  createdAt: Date;
}
