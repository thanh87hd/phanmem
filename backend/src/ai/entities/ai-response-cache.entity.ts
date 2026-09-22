import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('ai_response_cache')
export class AiResponseCache {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  questionHash: string; // MD5 hash of the normalized user question

  @Column({ type: 'text' })
  questionText: string;

  @Column({ type: 'text' })
  responseText: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  source: string;

  @CreateDateColumn()
  createdAt: Date;
}
