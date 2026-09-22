import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('executive_sessions')
export class ExecutiveSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string; // "Phiên họp kín Định kỳ BKS - Trưởng Ban KTNB Q2/2026"

  @Column({ type: 'date' })
  meetingDate: string; // YYYY-MM-DD

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'simple-array', nullable: true })
  attendees: string[]; // Danh sách thành viên BKS và Trưởng Ban KTNB

  // Tiêu chí quan trọng của IIA Std 2.2: Phiên họp kín bắt buộc không có Ban Điều hành
  @Column({ default: false })
  hasManagementPresent: boolean;

  // Nội dung thảo luận mật
  @Column({ type: 'jsonb', nullable: true })
  confidentialTopics: {
    topic: string;
    riskCategory: 'FraudRisk' | 'ScopeLimitation' | 'ExecutiveConflict' | 'EmergingRisk' | 'Other';
    discussionSummary: string;
    severity: 'High' | 'Critical';
  }[];

  @Column({ type: 'text', nullable: true })
  scopeLimitationsDisclosed: string; // Ghi nhận bất kỳ hạn chế nào về nguồn lực, tiếp cận tài liệu hoặc dữ liệu do Ban Điều hành tạo ra

  @Column({ type: 'jsonb', nullable: true })
  actionItems: {
    directive: string;
    assignee: string;
    dueDate: string;
    status: 'Open' | 'InProgress' | 'Done';
  }[];

  @Column({ default: 'Scheduled' })
  status: string; // Scheduled | Completed | Minuted

  @Column({ type: 'text', nullable: true })
  minutesSummary: string; // Kết luận chính của Phiên họp kín

  @Column({ nullable: true })
  recordedById: number;

  @Column({ nullable: true })
  recordedByName: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
