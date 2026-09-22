import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('report_definitions')
export class ReportDefinition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // Tên báo cáo / biểu đồ

  @Column()
  entityType: string; // VD: AuditFinding, AuditEngagement

  @Column()
  chartType: string; // 'bar', 'pie', 'line', 'table'

  @Column({ nullable: true })
  groupBy: string; // Trường phân nhóm (VD: status, riskLevel, cf_priority)

  @Column({ nullable: true })
  aggregateFunc: string; // 'COUNT', 'SUM', 'AVG'

  @Column({ nullable: true })
  aggregateField: string; // Trường tính toán (nếu SUM, AVG)

  @Column('jsonb', { nullable: true })
  filters: any; // Điều kiện lọc JSON

  @Column('jsonb', { nullable: true, default: [] })
  allowedRoles: string[]; // Danh sách các Role được phép xem biểu đồ này

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
