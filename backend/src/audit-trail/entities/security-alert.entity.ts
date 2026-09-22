import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('security_alerts')
export class SecurityAlert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: string; // UnauthorizedAccess | SuspiciousActivity | LoginFailure

  @Column({ type: 'text' })
  description: string;

  @Column()
  severity: string; // High | Medium | Low

  @Column({ nullable: true })
  userId: number;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  resource: string; // e.g. /users, /roles

  @Column({ nullable: true })
  action: string; // e.g. GET, POST, DELETE

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: false })
  isResolved: boolean;

  @Column({ nullable: true })
  resolvedBy: string;

  @Column({ nullable: true })
  resolutionNotes: string;
}
