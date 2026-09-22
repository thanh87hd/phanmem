import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('thematic_themes')
export class ThematicTheme {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ length: 100 })
  themeId: string; // TH-2026-001, TH-2026-002...

  @Column({ length: 255 })
  themeTitle: string; // Tên mẫu hình / rủi ro chuyên đề xuyên suốt

  @Index()
  @Column({ length: 50 })
  riskDomainCode: string; // CNTT, NHBL, NHDN, QTRR, TD_DVKD, PGDBD...

  @Column({ length: 50, nullable: true })
  analysisPeriod: string; // Kỳ dữ liệu: 2024-2026H1, 2025-2026...

  @Column({ type: 'text', nullable: true })
  affectedPopulation: string; // Đơn vị/quy trình/sản phẩm bị ảnh hưởng

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  issueIds: string[]; // Danh sách Issue/Finding IDs liên quan: ["ISS-2026-010", "FD-001"...]

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  riskIds: string[]; // Danh sách Risk Register IDs liên quan: ["RISK-CR-0001", "RSK-001"...]

  @Column({ length: 50, default: 'Stable' })
  riskTrajectory: string; // 'Increasing' | 'Stable' | 'Decreasing' | 'Emerging'

  @Column({ type: 'text', nullable: true })
  systemicRootCause: string; // Nguyên nhân gốc rễ mang tính hệ thống

  @Column({ type: 'text', nullable: true })
  assuranceGap: string; // Rủi ro chưa được coverage đầy đủ

  @Column({ type: 'text', nullable: true })
  recommendedResponse: string; // Hành động cấp hệ thống / kế hoạch kiểm toán chuyên đề

  @Column({ length: 50, default: 'Moderate' })
  themePriority: string; // 'Critical' | 'High' | 'Moderate' | 'Low'

  @Column({ length: 100, nullable: true })
  approvalRef: string; // Quyết định phê duyệt sử dụng phân tích: CAE/BKS...

  @Column({ length: 50, default: 'Draft' })
  status: string; // 'Draft' | 'Approved' | 'In_Progress' | 'Action_Taken' | 'Closed'

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
