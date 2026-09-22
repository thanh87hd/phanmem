import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { RegulatoryKnowledge } from './regulatory-knowledge.entity';

@Entity('document_chunks')
@Index(['regulatoryKnowledgeId'])
@Index(['regulatoryKnowledgeId', 'chunkIndex'])
export class DocumentChunk {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  regulatoryKnowledgeId: number;

  @ManyToOne(() => RegulatoryKnowledge, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'regulatoryKnowledgeId' })
  regulatoryKnowledge: RegulatoryKnowledge;

  @Column({ type: 'int' })
  chunkIndex: number;

  @Column({ type: 'text' })
  content: string; // Nội dung Markdown của chunk

  @Column({ nullable: true })
  heading: string; // Tiêu đề mục (VD: "Điều 5. Kiểm soát nội bộ", "## 1. Phạm vi")

  @Column({ type: 'int', nullable: true })
  pageNumber: number;

  @Column({ type: 'int', default: 0 })
  charCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
