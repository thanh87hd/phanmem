import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('qaip_surveys')
export class QaipSurvey {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  engagementName: string;

  @Column()
  departmentName: string;

  @Column({ type: 'int' })
  ratingProfessionalism: number; // 1-5

  @Column({ type: 'int' })
  ratingCommunication: number; // 1-5

  @Column({ type: 'int' })
  ratingValueAdded: number; // 1-5

  @Column('float')
  averageScore: number;

  @Column({ type: 'text', nullable: true })
  feedback: string;

  @CreateDateColumn()
  createdAt: Date;
}
