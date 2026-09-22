import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('external_assurance_coordinations')
export class ExternalAssuranceCoordination {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 'ExternalAuditor' })
  partyType: string; // ExternalAuditor (Kiểm toán Độc lập) | StateBankInspection (Cơ quan TTGS NHNN) | StateAudit (Kiểm toán Nhà nước) | Other

  @Column()
  partyName: string; // VD: "PwC Việt Nam", "Cục Thanh tra Giám sát NHNN Khu vực 1"

  @Column({ type: 'int' })
  auditYear: number;

  @Column()
  engagementTitle: string; // "Kiểm toán BCTC Năm 2026", "Thanh tra Chuyên đề Phân loại Nợ & Trích lập Dự phòng"

  @Column({ type: 'text', nullable: true })
  sharedScope: string; // Phạm vi phối hợp, nội dung chia sẻ kết quả

  @Column({ type: 'simple-array', nullable: true })
  workPapersShared: string[]; // Danh mục Giấy tờ làm việc / Báo cáo KTNB đã chia sẻ cho bên ngoài

  @Column({ default: 'Moderate' })
  relianceLevel: string; // High | Moderate | Low | None — Mức độ KTNB tin cậy vào kết quả kiểm tra của bên ngoài

  @Column({ type: 'text', nullable: true })
  overlapReductionAreas: string; // Các lĩnh vực/chi nhánh KTNB giảm bớt kiểm tra trùng lặp để tiết kiệm chi phí & nguồn lực

  @Column({ type: 'text', nullable: true })
  keyFindingsSharedByExternal: string; // Tổng hợp các phát hiện trọng yếu từ bên ngoài mà KTNB cần theo dõi khắc phục

  @Column({ default: 'Active' })
  status: string; // Planned | Active | Concluded

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
