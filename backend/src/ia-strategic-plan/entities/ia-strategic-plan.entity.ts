import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('ia_strategic_plans')
export class IaStrategicPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string; // VD: "Kế hoạch Chiến lược KTNB LPBank 2026-2030"

  @Column({ type: 'int' })
  startYear: number; // Năm bắt đầu (VD: 2026)

  @Column({ type: 'int' })
  endYear: number; // Năm kết thúc (VD: 2030)

  @Column({ type: 'text' })
  vision: string; // Tầm nhìn KTNB

  @Column({ type: 'text' })
  mission: string; // Sứ mệnh KTNB

  @Column({ type: 'text', nullable: true })
  strategicObjectives: string; // Mục tiêu chiến lược (có thể là JSON hoặc text)

  @Column({ type: 'jsonb', nullable: true })
  keyInitiatives: {
    initiative: string;
    targetYear: number;
    priority: 'High' | 'Medium' | 'Low';
    status: 'Planned' | 'InProgress' | 'Completed' | 'Deferred';
    owner: string;
    kpi: string;
  }[];

  @Column({ type: 'text', nullable: true })
  resourceRequirements: string; // Yêu cầu nguồn lực (nhân sự, công nghệ, ngân sách)

  @Column({ type: 'text', nullable: true })
  riskCoverage: string; // Phạm vi bao phủ rủi ro theo audit universe

  @Column({ type: 'text', nullable: true })
  technologyStrategy: string; // Chiến lược công nghệ (CAATs, AI, data analytics)

  @Column({ type: 'text', nullable: true })
  stakeholderExpectations: string; // Kỳ vọng của các bên liên quan (HĐQT, BKS, TGĐ)

  @Column({ default: 'Draft' })
  status: string; // Draft | PendingApproval | Approved | Expired

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'preparedById' })
  preparedBy: User;

  @Column({ nullable: true })
  preparedById: number;

  @Column({ nullable: true })
  preparedByName: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approvedById' })
  approvedBy: User;

  @Column({ nullable: true })
  approvedById: number;

  @Column({ nullable: true })
  approvedByName: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'text', nullable: true })
  approvalNotes: string;

  @Column({ type: 'jsonb', nullable: true })
  reviewHistory: {
    action: 'DRAFT' | 'SUBMIT' | 'APPROVE' | 'REJECT';
    actorId: number;
    actorName: string;
    role: string;
    timestamp: string;
    notes: string;
  }[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
