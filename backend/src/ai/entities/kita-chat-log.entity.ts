import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('kita_chat_logs')
export class KitaChatLog {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ nullable: true, type: 'integer' })
  userId: number | null;

  @Column({ nullable: true })
  username: string;

  @Column({ type: 'text' })
  userQuestion: string;

  @Column({ type: 'text' })
  kitaReply: string;

  @Column({ nullable: true })
  intent: string;

  @Column({ nullable: true })
  source: string;

  @Column({ nullable: true })
  category: string;

  @Column({ default: false })
  isFallback: boolean;

  @Column({ type: 'integer', default: 0 })
  responseTimeMs: number;

  @CreateDateColumn()
  createdAt: Date;
}
