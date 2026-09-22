import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('defect_code_change_logs')
export class DefectCodeChangeLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  version: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'text', nullable: true })
  affectedCategories: string;

  @Column()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'text', nullable: true })
  generatedCodes: string; // JSON array of codes generated in this version
}
