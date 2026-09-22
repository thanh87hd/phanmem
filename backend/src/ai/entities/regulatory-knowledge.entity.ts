import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { DocumentChunk } from './document-chunk.entity';

@Entity('regulatory_knowledge_base')
export class RegulatoryKnowledge {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string; // Tên văn bản

  @Column()
  code: string; // Số hiệu văn bản (Vd: 39/2016/TT-NHNN)

  @Column()
  type: string; // Luật, Nghị định, Thông tư, Quy định nội bộ, Quy trình nghiệp vụ, Tiêu chuẩn ngành

  @Column({ default: 'Chung', nullable: true })
  businessProcess: string; // Nghiệp vụ: Tín dụng, Kế toán, CNTT, Nhân sự...

  @Column({ type: 'simple-array', nullable: true })
  relatedRisks: string[]; // Các rủi ro liên quan (Keywords để AI so khớp)

  @Column({ type: 'text', nullable: true })
  summary: string; // Tóm tắt nội dung chính phục vụ AI

  @Column({ type: 'text', nullable: true })
  fullContent: string; // Nội dung chi tiết (nếu có) để AI trích dẫn

  @Column({ type: 'date', nullable: true })
  effectiveDate: Date;

  @Column({ nullable: true })
  status: string; // Còn hiệu lực, Hết hiệu lực, Sắp sửa đổi

  @Column({ nullable: true })
  downloadLink: string; // Link đến file PDF kho văn bản

  @Column({ type: 'int', nullable: true })
  pageCount: number; // Số trang tài liệu

  @Column({ nullable: true })
  extractionMethod: string; // 'pdf-inspector' | 'marker-surya' | 'passthrough' | 'manual'

  @Column({ type: 'float', nullable: true })
  ocrConfidence: number; // Độ tin cậy OCR (0.0 - 1.0)

  @Column({ type: 'int', nullable: true })
  sourceDocumentId: number; // Link tới bảng documents nếu file gốc được lưu

  @OneToMany(() => DocumentChunk, (chunk) => chunk.regulatoryKnowledge)
  chunks: DocumentChunk[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
