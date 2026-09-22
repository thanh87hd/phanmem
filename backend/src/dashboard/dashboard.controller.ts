import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('stats')
  getStats(
    @Request() req: any,
    @Query('teamCode') teamCode?: string,
    @Query('unitType') unitType?: string,
    @Query('departmentId') departmentId?: string,
    @Query('year') year?: string,
    @Query('auditUniverse') auditUniverse?: string,
  ) {
    return this.service.getStats(
      req.user,
      teamCode,
      unitType,
      departmentId,
      year,
      auditUniverse,
    );
  }

  @Get('risk-distribution')
  getRiskDistribution(
    @Request() req: any,
    @Query('teamCode') teamCode?: string,
    @Query('unitType') unitType?: string,
    @Query('departmentId') departmentId?: string,
    @Query('year') year?: string,
    @Query('auditUniverse') auditUniverse?: string,
  ) {
    return this.service.getRiskDistribution(
      req.user,
      teamCode,
      unitType,
      departmentId,
      year,
      auditUniverse,
    );
  }

  @Get('audit-progress')
  getAuditProgress(
    @Request() req: any,
    @Query('teamCode') teamCode?: string,
    @Query('unitType') unitType?: string,
    @Query('departmentId') departmentId?: string,
    @Query('year') year?: string,
    @Query('auditUniverse') auditUniverse?: string,
  ) {
    return this.service.getAuditProgress(
      req.user,
      teamCode,
      unitType,
      departmentId,
      year,
      auditUniverse,
    );
  }

  @Get('recommendation-by-dept')
  getRecommendationByDept(
    @Request() req: any,
    @Query('teamCode') teamCode?: string,
    @Query('unitType') unitType?: string,
    @Query('departmentId') departmentId?: string,
    @Query('year') year?: string,
    @Query('auditUniverse') auditUniverse?: string,
  ) {
    return this.service.getRecommendationByDept(
      req.user,
      teamCode,
      unitType,
      departmentId,
      year,
      auditUniverse,
    );
  }

  @Get('risk-widgets')
  getRiskWidgets(
    @Request() req: any,
    @Query('unitType') unitType?: string,
    @Query('departmentId') departmentId?: string,
    @Query('year') year?: string,
    @Query('auditUniverse') auditUniverse?: string,
  ) {
    return this.service.getRiskWidgets(
      req.user,
      unitType,
      departmentId,
      year,
      auditUniverse,
    );
  }

  @Get('executive-grouped-overview')
  getExecutiveGroupedOverview(
    @Request() req: any,
    @Query('year') year?: string,
    @Query('quarter') quarter?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getExecutiveGroupedOverview(
      req.user,
      year,
      quarter,
      startDate,
      endDate,
    );
  }
}
