import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AuditPlanUnit } from './audit-plan-unit.entity';

@Entity('audit_plans')
export class AuditPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  year: number;

  @Column()
  name: string;

  @Column({ default: 'Draft' })
  status: string; // Draft, PendingApproval, Approved, Rejected

  @Column({ default: 'ToanKhoi' })
  ownerTeam: string; // PKT_HoiSo | PKT_DVKD | TongHop | ToanKhoi

  @Column({ nullable: true })
  approvedBy: number;

  @Column({ nullable: true })
  approvedAt: Date;

  // ==================== 2-Nấc Phê duyệt (Four-Eyes Principle) ====================
  @Column({ nullable: true })
  reviewerL1Id: number;

  @Column({ nullable: true })
  reviewerL1Name: string;

  @Column({ nullable: true })
  reviewedL1At: Date;

  @Column({ type: 'text', nullable: true })
  reviewerL1Notes: string;

  @Column({ nullable: true })
  approverL2Id: number;

  @Column({ nullable: true })
  approverL2Name: string;

  @Column({ nullable: true })
  approvedL2At: Date;

  @Column({ type: 'text', nullable: true })
  approverL2Notes: string;

  @Column({ type: 'simple-json', nullable: true })
  selectedUnits: {
    universeId: number;
    name: string;
    riskLevel: string;
    justification?: string;
    estDays: number;
    ktvCount: number;
    scheduledMonth?: number; // Tháng dự kiến (1 -> 12)
    targetQuarter?: string; // Q1, Q2, Q3, Q4
    leadAuditorId?: number; // Trưởng đoàn dự kiến
    leadAuditorName?: string;
    assignedTeamMembers?: { userId: number; fullName: string; role?: string }[]; // Thành viên đoàn dự kiến
  }[];

  @Column({ type: 'text', nullable: true })
  approvalNotes: string;

  @Column({ default: 0 })
  revisionCount: number; // Tổng số lần yêu cầu chỉnh sửa/review lại kế hoạch năm (dùng tính KPI)

  @Column({ type: 'simple-json', nullable: true })
  approvalHistory: {
    iteration: number;
    action:
      | 'SUBMIT'
      | 'REWORK'
      | 'APPROVE_L1'
      | 'APPROVE_L2'
      | 'APPROVE_FINAL'
      | 'REJECT';
    actorId: number;
    actorName: string;
    role: string;
    timestamp: string;
    notes: string;
  }[];

  @Column({ type: 'simple-json', nullable: true })
  revisions: {
    revisionIndex: number;
    reviewPeriod: string;
    reviewedAt: Date;
    reviewedBy: number;
    reviewerName: string;
    notes: string;
    changedUnits: {
      universeId: number;
      name: string;
      action: 'ADD' | 'REMOVE' | 'UPDATE';
      reason: string;
      nextPeriodPriority: boolean;
      oldValues?: { estDays: number; ktvCount: number };
      newValues?: { estDays: number; ktvCount: number };
    }[];
  }[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  customFields: Record<string, any>;

  /** GIAS 9.4: Normalized plan units (replaces JSON selectedUnits) */
  @OneToMany(() => AuditPlanUnit, (unit) => unit.plan, {
    cascade: true,
    eager: true,
  })
  planUnits: AuditPlanUnit[];
}
