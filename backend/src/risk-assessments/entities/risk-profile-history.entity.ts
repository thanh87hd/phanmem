import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('risk_profile_histories')
export class RiskProfileHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  riskProfileId: number;

  @Column({ nullable: true })
  changeRequestId: number;

  @Column({ default: 1 })
  version: number;

  @Column({ default: 'UPDATE' })
  action: string; // 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT'

  @Column({ type: 'jsonb', nullable: true })
  oldData: any;

  @Column({ type: 'jsonb', nullable: true })
  newData: any;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ nullable: true })
  changedByUserId: number;

  @Column({ nullable: true })
  changedByName: string;

  @Column({ nullable: true })
  approvedByL1Name: string;

  @Column({ nullable: true })
  approvedByL2Name: string;

  @CreateDateColumn()
  createdAt: Date;
}
