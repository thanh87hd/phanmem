import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('annual_control_assessments')
export class AnnualControlAssessment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  year: number; // Năm đánh giá (VD: 2026)

  @Column()
  title: string; // "Báo cáo Đánh giá Tổng thể Hệ thống Kiểm soát Nội bộ Ngân hàng Năm 2026"

  @Column({ default: 'Effective' })
  overallOpinion: string; // Effective (Hiệu quả) | Adequate (Cơ bản đạt) | NeedsImprovement (Cần chấn chỉnh) | Ineffective (Kém hiệu quả)

  @Column({ type: 'float', default: 95.0 })
  scopeCoverage: number; // Tỷ lệ % bao phủ các mảng rủi ro trọng yếu

  // Đánh giá 5 thành tố KSNB theo COSO 2013 & Thông tư 13/2018/TT-NHNN Điều 65
  @Column({ type: 'text', nullable: true })
  cosoControlEnvironment: string; // 1. Môi trường kiểm soát: Văn hóa rủi ro, quy tắc ứng xử, phân cấp ủy quyền

  @Column({ type: 'text', nullable: true })
  cosoRiskAssessment: string; // 2. Nhận diện & Đánh giá rủi ro: Khẩu vị rủi ro, đo lường rủi ro tín dụng/thị trường/hoạt động

  @Column({ type: 'text', nullable: true })
  cosoControlActivities: string; // 3. Hoạt động kiểm soát: Phân tách trách nhiệm, kiểm soát kép, hạn mức

  @Column({ type: 'text', nullable: true })
  cosoInformationCommunication: string; // 4. Thông tin & Truyền thông: Hệ thống báo cáo quản trị, kênh cảnh báo

  @Column({ type: 'text', nullable: true })
  cosoMonitoring: string; // 5. Giám sát: Giám sát thường xuyên Tuyến 2, KTNB Tuyến 3, theo dõi khắc phục

  @Column({ type: 'text', nullable: true })
  keyDeficienciesSummary: string; // Tổng kết các điểm khiếm khuyết KSNB trọng yếu phát hiện trong năm

  @Column({ type: 'text', nullable: true })
  strategicRecommendations: string; // Kiến nghị chiến lược gửi HĐQT & BKS để nâng cao hiệu lực KSNB

  @Column({ default: 'Draft' })
  status: string; // Draft | SubmittedToBks | ApprovedByBks

  @Column({ nullable: true })
  preparedById: number;

  @Column({ nullable: true })
  preparedByName: string;

  @Column({ nullable: true })
  approvedByBksId: number;

  @Column({ nullable: true })
  approvedByBksName: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedByBksAt: Date;

  @Column({ type: 'text', nullable: true })
  bksOpinionNotes: string; // Ý kiến đánh giá / Nghị quyết của Ban Kiểm Soát

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
