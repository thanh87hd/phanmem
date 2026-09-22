import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { DashboardConfigService } from './dashboard-config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashboard/config')
@UseGuards(JwtAuthGuard)
export class DashboardConfigController {
  constructor(private readonly configService: DashboardConfigService) {}

  /**
   * GET /dashboard/config/:dashboardKey?tabKey=xxx
   * Lấy cấu hình dashboard cho user hiện tại.
   */
  @Get(':dashboardKey')
  async getConfig(
    @Request() req: any,
    @Param('dashboardKey') dashboardKey: string,
    @Query('tabKey') tabKey?: string,
  ) {
    return this.configService.getConfig(
      req.user.userId,
      dashboardKey,
      tabKey || 'default',
    );
  }

  /**
   * PUT /dashboard/config/:dashboardKey
   * Lưu cấu hình widget cho user hiện tại.
   * Body: { tabKey?: string, widgets: [...] }
   */
  @Put(':dashboardKey')
  async saveConfig(
    @Request() req: any,
    @Param('dashboardKey') dashboardKey: string,
    @Body()
    body: {
      tabKey?: string;
      widgets: Array<{
        widgetId: string;
        visible: boolean;
        order: number;
        size: 'full' | 'half' | 'quarter';
      }>;
    },
  ) {
    try {
      return await this.configService.saveConfig(
        req.user.userId,
        dashboardKey,
        body.tabKey || 'default',
        body.widgets,
      );
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Lỗi khi lưu cấu hình Dashboard',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  /**
   * POST /dashboard/config/:dashboardKey/reset
   * Reset về cấu hình mặc định.
   * Body: { tabKey?: string }
   */
  @Post(':dashboardKey/reset')
  async resetConfig(
    @Request() req: any,
    @Param('dashboardKey') dashboardKey: string,
    @Body() body: { tabKey?: string },
  ) {
    try {
      return await this.configService.resetConfig(
        req.user.userId,
        dashboardKey,
        body?.tabKey || 'default',
      );
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Lỗi khi reset cấu hình Dashboard',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  /**
   * GET /dashboard/config/:dashboardKey/defaults
   * Lấy danh sách widget mặc định (không cần auth).
   */
  @Get(':dashboardKey/defaults')
  getDefaults(@Param('dashboardKey') dashboardKey: string) {
    return {
      widgets: this.configService.getDefaultWidgets(dashboardKey),
    };
  }
}
