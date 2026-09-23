import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RiskPlanningService } from './risk-planning.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class RiskPlanningController {
  constructor(private readonly riskPlanningService: RiskPlanningService) {}

  /**
   * GET /risk-planning/overview?year=
   * Trả về chỉ số và việc cần xử lý cho 4 bước trong Chu trình lập kế hoạch RBIA.
   */
  @Get('risk-planning/overview')
  getOverview(@Query('year') year?: string) {
    return this.riskPlanningService.getOverview(
      year ? parseInt(year, 10) : undefined,
    );
  }

  /**
   * GET /risk-signals?auditUniverseId=&year=
   * Tín hiệu rủi ro hợp nhất chỉ-đọc (KRI, RCSA, CAATs, Prior Findings).
   */
  @Get('risk-signals')
  getRiskSignals(
    @Query('auditUniverseId') auditUniverseId?: string,
    @Query('year') year?: string,
  ) {
    return this.riskPlanningService.getRiskSignals(
      auditUniverseId ? parseInt(auditUniverseId, 10) : undefined,
      year ? parseInt(year, 10) : undefined,
    );
  }
}
