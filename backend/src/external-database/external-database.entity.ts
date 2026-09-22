import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DatabaseType } from './external-database.dto';

@Entity('external_database_connections')
export class ExternalDatabaseConnection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  type: DatabaseType;

  @Column()
  host: string;

  @Column({ type: 'int' })
  port: number;

  @Column()
  username: string;

  @Column({ nullable: true })
  password?: string;

  @Column()
  database: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
