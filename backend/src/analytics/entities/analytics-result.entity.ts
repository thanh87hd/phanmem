import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('analytics_results')
export class AnalyticsResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  scenarioType: string;

  @Column({ type: 'varchar', length: 255 })
  message: string;

  @Column({ type: 'json' })
  data: any;

  @Column({ type: 'varchar', length: 50, default: 'Success' })
  status: string;

  @CreateDateColumn()
  executedAt: Date;
}
