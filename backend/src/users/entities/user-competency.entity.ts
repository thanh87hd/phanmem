import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_competencies')
export class UserCompetency {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @Column()
  skillName: string; // Tín dụng, Kế toán & Kho quỹ, Vận hành thẻ, Công nghệ thông tin, Quản trị rủi ro...

  @Column({ default: 'Core' })
  skillCategory: string; // Core | Specialized | SoftSkill

  @Column({ type: 'int', default: 3 })
  rating: number; // Điểm năng lực (1 - 5)

  @Column({ type: 'text', nullable: true })
  notes: string; // Kinh nghiệm, chứng chỉ liên quan

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
