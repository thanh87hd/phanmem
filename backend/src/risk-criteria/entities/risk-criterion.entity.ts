import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('risk_criteria')
export class RiskCriterion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // Tên tiêu chí: Rủi ro tín dụng, hoạt động, tuân thủ...

  @Column('float')
  weight: number; // Trọng số (%)

  @Column({ default: 'Rủi ro Hoạt động' })
  category: string; // Tín dụng, Thị trường, Thanh khoản, v.v. theo TT83

  @Column({ default: 'ChiNhanh' })
  auditCategory: string; // HoiSo, ChiNhanh, PGD, HeThong, ChuyenDe

  @Column({ nullable: true })
  description: string;

  @Column({ default: 'Active' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
