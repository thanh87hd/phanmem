import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DefectDimension {
  INTERNAL = 'INTERNAL',
  ND340 = 'ND340',
  NHANSU = 'NHANSU',
}

@Entity('defect_codes')
export class DefectCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: DefectDimension })
  dimension: DefectDimension;

  @Column()
  code: string; // L3 Code

  @Column({ type: 'text' })
  description: string;

  @Column({ nullable: true })
  l1Code: string;

  @Column({ nullable: true })
  l1Desc: string;

  @Column({ nullable: true })
  l2Code: string;

  @Column({ nullable: true })
  l2Desc: string;

  @Column({ nullable: true })
  riskLevel: number; // e.g., 1, 2, 3

  @Column({ type: 'float', nullable: true })
  minFine: number; // For ND340

  @Column({ type: 'float', nullable: true })
  maxFine: number; // For ND340

  @Column({ type: 'float', nullable: true })
  avgFine: number; // For ND340

  // Mapping string codes. For Internal, these hold detailed JSON arrays for suggestions
  @Column({ type: 'jsonb', nullable: true })
  mappedNd340Suggestions: { code: string; desc: string; score: number }[];

  @Column({ type: 'jsonb', nullable: true })
  mappedNhanSuSuggestions: {
    code: string;
    desc: string;
    risk: number;
    score: number;
  }[];

  @Column({ default: '1.0' })
  version: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
