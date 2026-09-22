import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Index(['resource', 'resourceId'])
@Index(['userId'])
@Index(['createdAt'])
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  action: string; // 'CREATE' | 'UPDATE' | 'DELETE'

  @Column()
  resource: string; // e.g. 'audit-findings', 'recommendations'

  @Column({ nullable: true })
  resourceId: string;

  @Column({ nullable: true })
  userId: number;

  @Column({ nullable: true })
  username: string;

  @Column({ type: 'text', nullable: true })
  oldValue: string; // JSON stringified

  @Column({ type: 'text', nullable: true })
  newValue: string; // JSON stringified

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}
