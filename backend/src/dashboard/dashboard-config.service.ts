import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DashboardConfig } from './entities/dashboard-config.entity';
import { User } from '../users/entities/user.entity';
import { ScopeFilterService } from '../utils/scope-filter.service';

/**
 * Default widget definitions per dashboard.
 * These are returned when a user has no saved config.
 */
const DEFAULT_WIDGETS: Record<
  string,
  Array<{
    widgetId: string;
    visible: boolean;
    order: number;
    size: 'full' | 'half' | 'quarter';
  }>
> = {
  home: [
    { widgetId: 'kpi-cards', visible: true, order: 1, size: 'full' },
    { widgetId: 'airisk-map', visible: true, order: 2, size: 'full' },
    { widgetId: 'rec-completion', visible: true, order: 3, size: 'full' },
    { widgetId: 'audit-progress-pie', visible: true, order: 4, size: 'half' },
    { widgetId: 'risk-bar-chart', visible: true, order: 5, size: 'half' },
    { widgetId: 'risk-pending-review', visible: true, order: 6, size: 'half' },
    { widgetId: 'top-high-risks', visible: true, order: 7, size: 'half' },
    { widgetId: 'risk-heatmap', visible: true, order: 8, size: 'full' },
    { widgetId: 'ews-alerts', visible: true, order: 9, size: 'full' },
    { widgetId: 'rec-by-dept', visible: true, order: 10, size: 'full' },
  ],
  execution: [
    { widgetId: 'exec-kpi-cards', visible: true, order: 1, size: 'full' },
    { widgetId: 'exec-progress', visible: true, order: 2, size: 'full' },
    { widgetId: 'exec-status-pie', visible: true, order: 3, size: 'half' },
    { widgetId: 'exec-priority-bar', visible: true, order: 4, size: 'half' },
    { widgetId: 'exec-urgent-tasks', visible: true, order: 5, size: 'half' },
    { widgetId: 'exec-workload', visible: true, order: 6, size: 'half' },
    { widgetId: 'exec-engagement', visible: true, order: 7, size: 'full' },
    { widgetId: 'exec-staff-perf', visible: true, order: 8, size: 'full' },
  ],
  committee: [
    { widgetId: 'comm-kpi-cards', visible: true, order: 1, size: 'full' },
    { widgetId: 'comm-3lod', visible: true, order: 2, size: 'full' },
    { widgetId: 'comm-charter', visible: true, order: 3, size: 'full' },
  ],
  'findings-analytics': [
    { widgetId: 'fa-kpi-cards', visible: true, order: 1, size: 'full' },
    { widgetId: 'fa-by-unit', visible: true, order: 2, size: 'full' },
    { widgetId: 'fa-by-process', visible: true, order: 3, size: 'full' },
    { widgetId: 'fa-remediation', visible: true, order: 4, size: 'full' },
    { widgetId: 'fa-by-region', visible: true, order: 5, size: 'full' },
    { widgetId: 'fa-responsibility', visible: true, order: 6, size: 'full' },
    { widgetId: 'fa-nd340', visible: true, order: 7, size: 'full' },
    { widgetId: 'fa-nhansu', visible: true, order: 8, size: 'full' },
    { widgetId: 'fa-history', visible: true, order: 9, size: 'full' },
  ],
  kri: [
    { widgetId: 'kri-upload', visible: true, order: 1, size: 'full' },
    { widgetId: 'kri-analysis', visible: true, order: 2, size: 'full' },
    { widgetId: 'kri-report', visible: true, order: 3, size: 'full' },
    { widgetId: 'kri-compare', visible: true, order: 4, size: 'full' },
  ],
};

@Injectable()
export class DashboardConfigService {
  constructor(
    @InjectRepository(DashboardConfig)
    private configRepo: Repository<DashboardConfig>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /**
   * Kiểm tra user có quyền tùy chỉnh dashboard hay không.
   */
  private async canCustomize(userId: number): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['role'],
    });
    if (!user) return false;

    return (
      user.username?.toLowerCase() === 'admin' ||
      ScopeFilterService.isAdminRole(user.role?.name, user.jobTitle)
    );
  }

  /**
   * Lấy cấu hình dashboard cho user. Fallback về default nếu chưa lưu.
   */
  async getConfig(
    userId: number,
    dashboardKey: string,
    tabKey: string = 'default',
  ): Promise<{ widgets: any[]; isDefault: boolean; canCustomize: boolean }> {
    const canEdit = await this.canCustomize(userId);

    const saved = await this.configRepo.findOne({
      where: { userId, dashboardKey, tabKey },
    });

    if (saved) {
      return {
        widgets: saved.config.widgets,
        isDefault: false,
        canCustomize: canEdit,
      };
    }

    // Fallback to defaults
    const defaults = DEFAULT_WIDGETS[dashboardKey] || [];
    return {
      widgets: defaults,
      isDefault: true,
      canCustomize: canEdit,
    };
  }

  /**
   * Lưu cấu hình widget cho user.
   */
  async saveConfig(
    userId: number,
    dashboardKey: string,
    tabKey: string = 'default',
    widgets: Array<{
      widgetId: string;
      visible: boolean;
      order: number;
      size: 'full' | 'half' | 'quarter';
    }>,
  ): Promise<DashboardConfig> {
    const canEdit = await this.canCustomize(userId);
    if (!canEdit) {
      throw new Error('Bạn không có quyền tùy chỉnh Dashboard.');
    }

    // Validate widget IDs against known defaults
    const knownWidgets = (DEFAULT_WIDGETS[dashboardKey] || []).map(
      (w) => w.widgetId,
    );
    const validWidgets = widgets.filter((w) =>
      knownWidgets.includes(w.widgetId),
    );

    let config = await this.configRepo.findOne({
      where: { userId, dashboardKey, tabKey },
    });

    if (config) {
      config.config = { widgets: validWidgets };
      return this.configRepo.save(config);
    }

    config = this.configRepo.create({
      userId,
      dashboardKey,
      tabKey,
      config: { widgets: validWidgets },
    });
    return this.configRepo.save(config);
  }

  /**
   * Reset cấu hình về mặc định (xóa bản ghi đã lưu).
   */
  async resetConfig(
    userId: number,
    dashboardKey: string,
    tabKey: string = 'default',
  ): Promise<{ widgets: any[] }> {
    const canEdit = await this.canCustomize(userId);
    if (!canEdit) {
      throw new Error('Bạn không có quyền tùy chỉnh Dashboard.');
    }

    await this.configRepo.delete({ userId, dashboardKey, tabKey });

    const defaults = DEFAULT_WIDGETS[dashboardKey] || [];
    return { widgets: defaults };
  }

  /**
   * Lấy danh sách widget mặc định cho một dashboard.
   */
  getDefaultWidgets(dashboardKey: string) {
    return DEFAULT_WIDGETS[dashboardKey] || [];
  }
}
