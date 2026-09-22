import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('kri_rule_configs')
export class KriRuleConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  ruleCode: string;

  @Column()
  category: string;

  @Column()
  metricName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'float', nullable: true })
  redThreshold: number;

  @Column({ nullable: true })
  redThresholdDisplay: string; // Hiển thị nguyên gốc (ví dụ: 'Hạng C', '> 20% Kế hoạch')

  @Column({ type: 'float', nullable: true })
  yellowThreshold: number;

  @Column({ nullable: true })
  yellowThresholdDisplay: string; // Hiển thị nguyên gốc

  @Column({ nullable: true })
  operator: string; // '<', '>', '<=', '>=', 'BETWEEN'

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
