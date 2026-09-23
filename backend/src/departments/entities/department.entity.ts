import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int', nullable: true })
  parentId: number; // ID đơn vị cha (Chuẩn hóa phân cấp)

  @ManyToOne(() => Department, (dept) => dept.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parentId' })
  parentDept: Department;

  @OneToMany(() => Department, (dept) => dept.parentDept)
  children: Department[];

  @Column({ type: 'text', nullable: true })
  functions: string; // Chức năng, nhiệm vụ của phòng ban/đơn vị

  /**
   * Loại đơn vị tổ chức:
   * Khoi | UyBan | HoiDong | Phong | ChiNhanh | PGD | TrungTam | BDT | Khac
   */
  @Column({ default: 'Phong' })
  unitType: string;

  @Column({ default: 'Active' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  region: string; // Vùng quản lý: Vùng 1, Vùng 2...

  @Column({ type: 'jsonb', nullable: true })
  customFields: Record<string, any>;
}
