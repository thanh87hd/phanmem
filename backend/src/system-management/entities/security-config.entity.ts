import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('security_config')
export class SecurityConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  key: string;

  @Column()
  value: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  standard: string; // 'PCI_DSS' | 'ISO_27001' | 'BOTH'

  @Column({ nullable: true })
  standardRef: string; // e.g. 'PCI DSS 8.3.6', 'ISO 27001 A.8.15'

  @Column({ default: 'string' })
  valueType: string; // 'string' | 'number' | 'boolean'

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
