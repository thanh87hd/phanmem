import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RegulatoryExam } from './regulatory-exam.entity';

@Entity('regulatory_findings')
export class RegulatoryFinding {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => RegulatoryExam, (exam) => exam.findings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'examId' })
  exam: RegulatoryExam;

  @Column()
  examId: number;

  @Column({ type: 'text' })
  findingTitle: string;

  @Column({ type: 'text', nullable: true })
  requirement: string;

  @Column({ nullable: true })
  department: string;

  @Column({ type: 'date', nullable: true })
  deadline: string;

  @Column({ default: 'Open' })
  status: string; // Open, InProgress, Resolved

  @Column({ nullable: true })
  linkedInternalFindingId: number; // cross-reference with internal finding

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
