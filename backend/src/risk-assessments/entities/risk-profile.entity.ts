import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('risk_profiles')
export class RiskProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  profileCode: string; // HS01_HSRR_CNTT, HS09_HSRR_PTD_ĐVKD, etc.

  @Column()
  domainName: string; // Tên mảng nghiệp vụ (VD: Phi tín dụng ĐVKD)

  @Column({ nullable: true })
  riskCategory: string; // Nhóm rủi ro lớn

  @Column()
  riskL1: string; // Danh mục rủi ro cấp 1

  @Column({ type: 'text' })
  riskL2: string; // Danh mục rủi ro cấp 2 / Nguy cơ

  @Column({ type: 'text', nullable: true })
  impactCriteria: string; // Thang định nghĩa tác động (1-3)

  @Column({ type: 'text', nullable: true })
  likelihoodCriteria: string; // Thang định nghĩa khả năng xảy ra (1-3)

  @Column({ type: 'text', nullable: true })
  controlMeasures: string; // Biện pháp kiểm soát cần có

  @Column({ nullable: true })
  controlDesignQuality: string; // Chất lượng thiết kế kiểm soát: Cao / Trung bình / Thấp

  @Column({ default: 'Trung bình' })
  inherentImpact: string; // Cao / Trung bình / Thấp

  @Column({ default: 'Trung bình' })
  inherentLikelihood: string; // Cao / Trung bình / Thấp

  @Column({ default: 'Trung bình' })
  inherentRiskLevel: string; // Cao / Trung bình / Thấp (Điểm 1 - 3)

  @Column({ default: 'Trung bình' })
  controlOperatingEffectiveness: string; // Hiệu quả vận hành kiểm soát

  @Column({ default: 'Trung bình' })
  residualRiskLevel: string; // Mức độ rủi ro còn lại

  @Column({ default: 'ĐVKD' })
  targetEntity: string; // ĐVKD / ChiNhanh / PGD / HoiSo / PhongBan

  @Column({ type: 'jsonb', nullable: true })
  mappedDefectCodes: string[]; // Danh sách mã lỗi thực tế liên quan [PTD_001, TD_005...]

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
