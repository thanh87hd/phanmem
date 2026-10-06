import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('stats')
  getStats(
    @CurrentUser() user: JwtPayload,
    @Query('teamCode') teamCode?: string,
    @Query('unitType') unitType?: string,
    @Query('departmentId') departmentId?: string,
    @Query('year') year?: string,
    @Query('auditUniverse') auditUniverse?: string,
  ) {
    return this.service.getStats(
      user,
      teamCode,
      unitType,
      departmentId,
      year,
      auditUniverse,
    );
  }

  @Get('risk-distribution')
  getRiskDistribution(
    @CurrentUser() user: JwtPayload,
    @Query('teamCode') teamCode?: string,
    @Query('unitType') unitType?: string,
    @Query('departmentId') departmentId?: string,
    @Query('year') year?: string,
    @Query('auditUniverse') auditUniverse?: string,
  ) {
    return this.service.getRiskDistribution(
      user,
      teamCode,
      unitType,
      departmentId,
      year,
      auditUniverse,
    );
  }

  @Get('audit-progress')
  getAuditProgress(
    @CurrentUser() user: JwtPayload,
    @Query('teamCode') teamCode?: string,
    @Query('unitType') unitType?: string,
    @Query('departmentId') departmentId?: string,
    @Query('year') year?: string,
    @Query('auditUniverse') auditUniverse?: string,
  ) {
    return this.service.getAuditProgress(
      user,
      teamCode,
      unitType,
      departmentId,
      year,
      auditUniverse,
    );
  }

  @Get('recommendation-by-dept')
  getRecommendationByDept(
    @CurrentUser() user: JwtPayload,
    @Query('teamCode') teamCode?: string,
    @Query('unitType') unitType?: string,
    @Query('departmentId') departmentId?: string,
    @Query('year') year?: string,
    @Query('auditUniverse') auditUniverse?: string,
  ) {
    return this.service.getRecommendationByDept(
      user,
      teamCode,
      unitType,
      departmentId,
      year,
      auditUniverse,
    );
  }

  @Get('risk-widgets')
  getRiskWidgets(
    @CurrentUser() user: JwtPayload,
    @Query('unitType') unitType?: string,
    @Query('departmentId') departmentId?: string,
    @Query('year') year?: string,
    @Query('auditUniverse') auditUniverse?: string,
  ) {
    return this.service.getRiskWidgets(
      user,
      unitType,
      departmentId,
      year,
      auditUniverse,
    );
  }

  @Get('executive-grouped-overview')
  getExecutiveGroupedOverview(
    @CurrentUser() user: JwtPayload,
    @Query('year') year?: string,
    @Query('quarter') quarter?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getExecutiveGroupedOverview(
      user,
      year,
      quarter,
      startDate,
      endDate,
    );
  }
}
