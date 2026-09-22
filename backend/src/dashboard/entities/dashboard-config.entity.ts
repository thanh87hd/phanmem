import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Lưu cấu hình dashboard tùy chỉnh per-user.
 * Mỗi user có thể có cấu hình riêng cho mỗi dashboard + tab.
 */
@Entity('dashboard_configs')
@Unique(['userId', 'dashboardKey', 'tabKey'])
export class DashboardConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  /**
   * Mã dashboard: 'home' | 'execution' | 'committee' | 'findings-analytics' | 'kri'
   */
  @Column({ length: 50 })
  dashboardKey: string;

  /**
   * Mã tab (chủ yếu dùng cho Dashboard Home với 9 tab).
   * Nếu dashboard không có tab, dùng 'default'.
   */
  @Column({ length: 50, default: 'default' })
  tabKey: string;

  /**
   * Cấu hình widget dạng JSON:
   * {
   *   widgets: [
   *     { widgetId: 'kpi-cards', visible: true, order: 1, size: 'full' },
   *     ...
   *   ]
   * }
   */
  @Column({ type: 'jsonb' })
  config: {
    widgets: Array<{
      widgetId: string;
      visible: boolean;
      order: number;
      size: 'full' | 'half' | 'quarter';
    }>;
  };

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
