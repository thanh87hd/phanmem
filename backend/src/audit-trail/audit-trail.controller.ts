import { Controller, Get, Delete, Query, UseGuards } from '@nestjs/common';
import { AuditTrailService } from './audit-trail.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/casl-ability.factory';

@Controller('audit-trail')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class AuditTrailController {
  constructor(private readonly auditTrailService: AuditTrailService) {}

  @Get()
  @CheckPolicies((ability) => ability.can(Action.Manage, 'AuditTrail'))
  findAll(
    @Query('resource') resource?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditTrailService.findAll(resource, limit ? +limit : 100);
  }

  @Get('security-alerts')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'AuditTrail'))
  getSecurityAlerts() {
    return this.auditTrailService.findAllAlerts();
  }

  @Get('my-actions')
  findMyActions(@Query('userId') userId: string) {
    return this.auditTrailService.findByUser(+userId);
  }

  @Delete('cleanup')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'AuditTrail'))
  cleanup(@Query('months') months: string) {
    return this.auditTrailService.cleanupLogs(months ? +months : 6);
  }
}
