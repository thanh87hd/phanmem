import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { RegulatoryFinding } from './regulatory-finding.entity';

@Entity('regulatory_exams')
export class RegulatoryExam {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  authority: string; // NHNN, KTNN, etc.

  @Column({ type: 'date', nullable: true })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  endDate: string;

  @Column({ default: 'Open' })
  status: string; // Open, Closed

  @OneToMany(() => RegulatoryFinding, (finding) => finding.exam)
  findings: RegulatoryFinding[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
