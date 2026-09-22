import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { AuditCommitteeService } from './audit-committee.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/casl-ability.factory';

@Controller('audit-committee')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class AuditCommitteeController {
  constructor(private readonly service: AuditCommitteeService) {}

  @Get('charters')
  @CheckPolicies((ability) => ability.can(Action.Read, 'AuditCommittee'))
  getCharters() {
    return this.service.getCharters();
  }

  @Post('charters')
  @CheckPolicies((ability) => ability.can(Action.Create, 'AuditCommittee'))
  createCharter(@Body() data: any) {
    return this.service.createCharter(data);
  }

  @Patch('charters/:id/approve')
  @CheckPolicies((ability) => ability.can(Action.Update, 'AuditCommittee'))
  approveCharter(@Param('id') id: string, @Request() req: any) {
    return this.service.updateCharterStatus(
      +id,
      'Approved',
      req.user?.username,
    );
  }

  @Get('3lod')
  @CheckPolicies((ability) => ability.can(Action.Read, 'AuditCommittee'))
  get3LoDStats(
    @Query('departmentId') departmentId?: string,
    @Query('year') year?: string,
    @Query('auditUniverse') auditUniverse?: string,
  ) {
    return this.service.get3LoDStats(departmentId, year, auditUniverse);
  }

  @Get('highlights')
  @CheckPolicies((ability) => ability.can(Action.Read, 'AuditCommittee'))
  getHighlights(
    @Query('departmentId') departmentId?: string,
    @Query('year') year?: string,
    @Query('auditUniverse') auditUniverse?: string,
  ) {
    return this.service.getCommitteeHighlights(
      departmentId,
      year,
      auditUniverse,
    );
  }

  // ===== 4. TT13 Điều 65 & IIA Standard 11.3: Báo Cáo Đánh Giá Tổng Thể KSNB Hàng Năm =====
  @Get('annual-assessments')
  @CheckPolicies((ability) => ability.can(Action.Read, 'AuditCommittee'))
  getAnnualAssessments(@Query('year') year?: string) {
    return this.service.getAnnualAssessments(year ? parseInt(year, 10) : undefined);
  }

  @Get('annual-assessments/:id')
  @CheckPolicies((ability) => ability.can(Action.Read, 'AuditCommittee'))
  getAnnualAssessment(@Param('id') id: string) {
    return this.service.getAnnualAssessment(+id);
  }

  @Post('annual-assessments')
  @CheckPolicies((ability) => ability.can(Action.Create, 'AuditCommittee'))
  createAnnualAssessment(@Body() data: any, @Request() req: any) {
    return this.service.createAnnualAssessment(data, req.user);
  }

  @Patch('annual-assessments/:id')
  @CheckPolicies((ability) => ability.can(Action.Update, 'AuditCommittee'))
  updateAnnualAssessment(@Param('id') id: string, @Body() data: any) {
    return this.service.updateAnnualAssessment(+id, data);
  }

  @Post('annual-assessments/:id/approve')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'AuditCommittee'))
  approveAnnualAssessment(
    @Param('id') id: string,
    @Body('bksNotes') bksNotes: string,
    @Request() req: any,
  ) {
    return this.service.approveAnnualAssessment(+id, bksNotes, req.user);
  }

  // ===== 5. IIA Standard 2.2 & TT13 Điều 60: Phiên Họp Kín Độc Lập CAE - BKS (Bảo Mật Cao Cấp) =====
  @Get('executive-sessions')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'AuditCommittee'))
  getExecutiveSessions(@Query('year') year?: string) {
    return this.service.getExecutiveSessions(year ? parseInt(year, 10) : undefined);
  }

  @Get('executive-sessions/:id')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'AuditCommittee'))
  getExecutiveSession(@Param('id') id: string) {
    return this.service.getExecutiveSession(+id);
  }

  @Post('executive-sessions')
  @CheckPolicies((ability) => ability.can(Action.Create, 'AuditCommittee'))
  createExecutiveSession(@Body() data: any, @Request() req: any) {
    return this.service.createExecutiveSession(data, req.user);
  }

  @Patch('executive-sessions/:id')
  @CheckPolicies((ability) => ability.can(Action.Update, 'AuditCommittee'))
  updateExecutiveSession(@Param('id') id: string, @Body() data: any) {
    return this.service.updateExecutiveSession(+id, data);
  }

  @Post('executive-sessions/:id/minute')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'AuditCommittee'))
  minuteExecutiveSession(
    @Param('id') id: string,
    @Body('minutesSummary') minutesSummary: string,
    @Body('actionItems') actionItems: any[],
    @Request() req: any,
  ) {
    return this.service.minuteExecutiveSession(
      +id,
      minutesSummary,
      actionItems,
      req.user,
    );
  }

  // ===== 6. IIA Standard 9.5 & Basel BCBS: Điều Phối Bảo Đảm Bên Ngoài =====
  @Get('coordinations')
  @CheckPolicies((ability) => ability.can(Action.Read, 'AuditCommittee'))
  getCoordinations(@Query('year') year?: string) {
    return this.service.getCoordinations(year ? parseInt(year, 10) : undefined);
  }

  @Get('coordinations/:id')
  @CheckPolicies((ability) => ability.can(Action.Read, 'AuditCommittee'))
  getCoordination(@Param('id') id: string) {
    return this.service.getCoordination(+id);
  }

  @Post('coordinations')
  @CheckPolicies((ability) => ability.can(Action.Create, 'AuditCommittee'))
  createCoordination(@Body() data: any) {
    return this.service.createCoordination(data);
  }

  @Patch('coordinations/:id')
  @CheckPolicies((ability) => ability.can(Action.Update, 'AuditCommittee'))
  updateCoordination(@Param('id') id: string, @Body() data: any) {
    return this.service.updateCoordination(+id, data);
  }

  @Delete('coordinations/:id')
  @CheckPolicies((ability) => ability.can(Action.Delete, 'AuditCommittee'))
  deleteCoordination(@Param('id') id: string) {
    return this.service.deleteCoordination(+id);
  }
}
