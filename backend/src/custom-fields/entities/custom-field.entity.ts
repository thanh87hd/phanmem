import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('custom_field_definitions')
export class CustomFieldDefinition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  entityType: string; // 'AuditFinding', 'AuditEngagement', 'AuditUniverse', 'Recommendation'

  @Column()
  name: string; // Tên biến lưu trong JSONB (VD: 'rootCause')

  @Column()
  label: string; // Tên hiển thị (VD: 'Nguyên nhân gốc rễ')

  @Column()
  type: string; // 'text', 'number', 'date', 'select', 'textarea'

  @Column({ default: false })
  required: boolean;

  @Column({ type: 'jsonb', nullable: true })
  options: any[]; // Cho kiểu 'select' [{ label: 'A', value: 'a' }]

  @Column({ default: 0 })
  order: number;

  @Column({ default: false })
  showInTable: boolean; // Hiển thị trên Table list

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
