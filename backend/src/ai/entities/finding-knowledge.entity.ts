import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditUniverse } from '../../audit-universe/entities/audit-universe.entity';
import { DefectCode } from './defect-code.entity';

@Entity('finding_knowledge_base')
export class FindingKnowledge {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  category: string; // Vd: Tín dụng, Huy động, Kế toán, CNTT, Vận hành...

  @Column()
  title: string; // Tên sai phạm mẫu

  @Column({ type: 'text' })
  description: string; // Mô tả chi tiết hành vi sai phạm

  @Column({ type: 'text', nullable: true })
  criteria: string; // Các quy định, quy trình liên quan (chuẩn mực vi phạm)

  @Column()
  riskLevel: string; // High, Medium, Low

  @Column({ type: 'text', nullable: true })
  suggestedRecommendation: string; // Khuyến nghị mẫu của AI

  @Column({ type: 'text', nullable: true })
  closingGuide: string; // Gợi ý đóng kiến nghị kiểm toán

  @Column({ type: 'simple-array', nullable: true })
  keywords: string[]; // Các từ khóa để AI nhận diện (Vd: "quá hạn", "không chữ ký", "vượt hạn mức")

  @ManyToOne(() => AuditUniverse)
  @JoinColumn({ name: 'auditUniverseId' })
  auditUniverse: AuditUniverse;

  @Column({ nullable: true })
  auditUniverseId: number;

  @ManyToOne(() => DefectCode)
  @JoinColumn({ name: 'defectCodeId' })
  defectCode: DefectCode;

  @Column({ nullable: true })
  defectCodeId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
