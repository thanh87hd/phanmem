import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  DashboardConfigService,
  DashboardWidgetItem,
} from './dashboard-config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

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
    @CurrentUser() user: JwtPayload,
    @Param('dashboardKey') dashboardKey: string,
    @Query('tabKey') tabKey?: string,
  ) {
    return this.configService.getConfig(
      user.userId,
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
    @CurrentUser() user: JwtPayload,
    @Param('dashboardKey') dashboardKey: string,
    @Body()
    body: {
      tabKey?: string;
      widgets: DashboardWidgetItem[];
    },
  ) {
    try {
      return await this.configService.saveConfig(
        user.userId,
        dashboardKey,
        body.tabKey || 'default',
        body.widgets,
      );
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Lỗi khi lưu cấu hình Dashboard';
      throw new HttpException(msg, HttpStatus.FORBIDDEN);
    }
  }

  /**
   * POST /dashboard/config/:dashboardKey/reset
   * Reset về cấu hình mặc định.
   * Body: { tabKey?: string }
   */
  @Post(':dashboardKey/reset')
  async resetConfig(
    @CurrentUser() user: JwtPayload,
    @Param('dashboardKey') dashboardKey: string,
    @Body() body: { tabKey?: string },
  ) {
    try {
      return await this.configService.resetConfig(
        user.userId,
        dashboardKey,
        body?.tabKey || 'default',
      );
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Lỗi khi reset cấu hình Dashboard';
      throw new HttpException(msg, HttpStatus.FORBIDDEN);
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
