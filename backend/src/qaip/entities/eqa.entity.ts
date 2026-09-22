import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('eqa_assessments')
export class EqaAssessment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string; // e.g., Đánh giá chất lượng độc lập 2024

  @Column()
  evaluator: string; // Tên tổ chức đánh giá (PwC, EY, etc.)

  @Column({ type: 'date' })
  dateConducted: string;

  @Column({ type: 'date' })
  nextDueDate: string; // Thường là +5 năm

  @Column({ default: 'Completed' })
  status: string; // Planned, InProgress, Completed

  @Column({ default: 'Generally Conforms' })
  conformityLevel: string; // Generally Conforms, Partially Conforms, Does Not Conform

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
