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
import { Department } from '../../departments/entities/department.entity';
import { AuditUniverse } from '../../audit-universe/entities/audit-universe.entity';

export type InherentRiskLevel = 'High' | 'Medium' | 'Low';
export type ControlType = 'Preventive' | 'Detective';
export type ControlAutomation = 'Manual' | 'Automated' | 'IT-Dependent Manual';

@Entity('risk_control_matrix')
export class RiskControlMatrix {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => AuditUniverse, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'processId' })
  process: AuditUniverse;

  @Index()
  @Column({ nullable: true })
  processId: number;

  @Column({ name: 'processName', type: 'varchar', length: 200, nullable: true })
  legacyProcessName: string; // Tên Quy trình (VD: Cho vay KHCN)

  @Column({ type: 'varchar', length: 200, nullable: true })
  subProcess: string; // Quy trình con

  @Column({ type: 'text', nullable: true })
  businessObjective: string; // Mục tiêu kinh doanh

  @Column({ type: 'varchar', length: 255 })
  riskName: string; // Tên Rủi ro

  @Column({ type: 'text', nullable: true })
  riskDescription: string; // Mô tả rủi ro

  @Column({ type: 'varchar', length: 50, nullable: true })
  inherentRiskScore: string; // Điểm rủi ro tiềm tàng (High, Medium, Low)

  @Column({ type: 'varchar', length: 255 })
  controlName: string; // Tên Chốt kiểm soát

  @Column({ type: 'text', nullable: true })
  controlDescription: string; // Mô tả chốt kiểm soát

  @Column({ type: 'varchar', length: 50, nullable: true })
  controlType: string; // Preventive (Phòng ngừa) hoặc Detective (Phát hiện)

  @Column({ type: 'varchar', length: 50, nullable: true })
  controlFrequency: string; // Tần suất kiểm soát (Hàng ngày, Hàng tuần...)

  @Column({ type: 'varchar', length: 50, nullable: true })
  controlAutomation: string; // Manual, Automated, IT-Dependent Manual

  @Column({ type: 'text', nullable: true })
  testProcedure: string; // Thủ tục kiểm toán (Cách kiểm tra)

  @Column({ type: 'text', nullable: true })
  expectedEvidence: string; // Bằng chứng mong đợi

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ownerDepartmentId' })
  ownerDepartment: Department;

  @Index()
  @Column({ nullable: true })
  ownerDepartmentId: number;

  @Column({ name: 'ownerTeam', type: 'varchar', length: 100, nullable: true })
  legacyOwnerTeam: string; // Đội/Phòng ban sở hữu RCM này (VD: PKT_HoiSo)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
