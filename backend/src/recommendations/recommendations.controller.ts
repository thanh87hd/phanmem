import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  Res,
} from '@nestjs/common';

import { RecommendationsService } from './recommendations.service';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { UpdateRecommendationDto } from './dto/update-recommendation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/casl-ability.factory';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('recommendations')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class RecommendationsController {
  constructor(
    private readonly service: RecommendationsService,
    private readonly auditTrailService: AuditTrailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Post()
  async create(@Body() dto: CreateRecommendationDto, @Request() req: any) {
    const result = await this.service.create(dto, req.user);
    await this.auditTrailService.log({
      action: 'CREATE',
      resource: 'recommendations',
      resourceId: (result as any)?.id,
      userId: req.user?.userId,
      username: req.user?.username,
      newValue: { finding: dto.finding, legacyDepartment: dto.department },
    });

    // Notify assigned person
    if ((dto as any).assignedToId) {
      await this.notificationsService.create({
        type: 'ASSIGNMENT',
        title: 'Kiến nghị mới được giao',
        message: `Kiến nghị liên quan "${dto.finding}" đã được giao cho bạn. Hạn: ${(dto as any).dueDate || 'Chưa xác định'}`,
        recipientId: (dto as any).assignedToId,
        senderId: req.user?.userId,
        link: '/recommendations',
        relatedEntity: 'Recommendation',
        relatedEntityId: (result as any)?.id,
      });
    }

    return result;
  }

  @Get()
  findAll(
    @Request() req: any,
    @Query('slaStatus') slaStatus?: string,
    @Query('closureStatus') closureStatus?: string,
    @Query('department') department?: string,
    @Query('selfMonitored') selfMonitored?: string,
    @Query('engagementId') engagementId?: string,
    @Query('findingId') findingId?: string,
  ) {
    return this.service.findAll(req.user, {
      slaStatus: slaStatus || undefined,
      closureStatus: closureStatus || undefined,
      department: department || undefined,
      selfMonitored:
        selfMonitored === undefined ? undefined : selfMonitored === 'true',
      engagementId: engagementId ? +engagementId : undefined,
      findingId: findingId ? +findingId : undefined,
    });
  }

  @Get('stats')
  getStats() {
    return this.service.getStats();
  }

  @Get('export-full')
  async exportFull(@Res() res: any) {
    const buffer = await this.service.exportFull();
    res.header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.header(
      'Content-Disposition',
      'attachment; filename=Findings_Recommendations_Full.xlsx',
    );
    res.send(buffer);
  }

  /** Check and mark overdue recommendations */
  @Post('check-overdue')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'Recommendation'))
  async checkOverdue() {
    const count = await this.service.checkAndMarkOverdue();
    return { message: `Đã đánh dấu ${count} kiến nghị quá hạn`, count };
  }

  /** ĐVĐKT Portal: Get recommendations by department */
  @Get('by-department')
  findByDepartment(@Query('dept') dept: string) {
    if (!dept) return this.service.findAll();
    return this.service.findByDepartment(dept);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  /** ĐVĐKT cập nhật tiến độ khắc phục */
  /** ĐVĐKT cập nhật kế hoạch khắc phục */
  @Post(':id/submit-plan')
  submitPlan(
    @Param('id') id: string,
    @Body('plan') plan: string,
    @Body('targetDate') targetDate: string,
    @Body() body: any,
  ) {
    return this.service.submitRemediationPlan(+id, plan, targetDate, body);
  }

  @Post(':id/progress')
  async updateProgress(
    @Param('id') id: string,
    @Body('progressPercent') progressPercent: number,
    @Body('response') response?: string,
    @Body('notes') notes?: string,
    @Body() body?: any,
    @Request() req?: any,
  ) {
    const result = await this.service.updateProgress(
      +id,
      progressPercent,
      response,
      notes,
      body,
    );
    await this.auditTrailService.log({
      action: 'UPDATE',
      resource: 'recommendations',
      resourceId: +id,
      userId: req.user?.userId,
      username: req.user?.username,
      newValue: {
        progressPercent,
        response,
        notes,
        status: (result as any)?.status,
        ...body,
      },
    });
    return result;
  }

  @Post(':id/request-closure')
  requestClosure(@Param('id') id: string, @Request() req: any) {
    return this.service.requestClosure(+id, req.user);
  }

  @Post(':id/ktnb-review')
  ktnbReview(
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @Request() req: any,
  ) {
    return this.service.ktnbReview(+id, body?.notes || '', req.user);
  }

  @Post(':id/team-lead-opinion')
  teamLeadOpinion(
    @Param('id') id: string,
    @Body() body: { opinion: string },
    @Request() req: any,
  ) {
    return this.service.teamLeadOpinion(+id, body?.opinion || '', req.user);
  }

  @Post(':id/close')
  close(
    @Param('id') id: string,
    @Body('closedReason') closedReason: string,
    @Request() req: any,
  ) {
    return this.service.close(+id, closedReason, req.user);
  }

  /** KTV xác nhận khắc phục */
  @Post(':id/verify')
  @CheckPolicies((ability) => ability.can(Action.Update, 'Recommendation'))
  async verify(
    @Param('id') id: string,
    @Body() body: { notes: string },
    @Request() req: any,
  ) {
    const result = await this.service.verify(+id, body.notes, req.user);
    await this.auditTrailService.log({
      action: 'UPDATE',
      resource: 'recommendations',
      resourceId: +id,
      userId: req.user?.userId,
      username: req.user?.username,
      newValue: { status: 'Verified', verificationNotes: body.notes },
    });
    return result;
  }

  @Patch(':id/self-monitor')
  async setSelfMonitor(
    @Param('id') id: string,
    @Body() body: { selfMonitored: boolean; selfMonitorFrequency?: string },
    @Request() req: any,
  ) {
    const result = await this.service.setSelfMonitor(
      +id,
      body.selfMonitored,
      body.selfMonitorFrequency,
      req.user,
    );
    await this.auditTrailService.log({
      action: 'UPDATE',
      resource: 'recommendations',
      resourceId: +id,
      userId: req.user?.userId,
      username: req.user?.username,
      newValue: {
        selfMonitored: body.selfMonitored,
        selfMonitorFrequency: body.selfMonitorFrequency,
      },
    });
    return result;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRecommendationDto,
    @Request() req: any,
  ) {
    const result = await this.service.update(+id, dto, req.user);
    await this.auditTrailService.log({
      action: 'UPDATE',
      resource: 'recommendations',
      resourceId: +id,
      userId: req.user?.userId,
      username: req.user?.username,
      newValue: dto,
    });
    return result;
  }

  // ===== IIA Standard 7.3: Risk Acceptance Endpoints =====
  @Post(':id/risk-acceptance/request')
  async requestRiskAcceptance(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    const result = await this.service.requestRiskAcceptance(+id, reason, req.user);
    await this.auditTrailService.log({
      action: 'UPDATE',
      resource: 'recommendations',
      resourceId: +id,
      userId: req.user?.userId,
      username: req.user?.username,
      newValue: { riskAcceptanceStatus: 'PendingCAE', riskAcceptanceReason: reason },
    });
    return result;
  }

  @Post(':id/risk-acceptance/cae-review')
  async reviewRiskAcceptanceByCAE(
    @Param('id') id: string,
    @Body('forwardToBks') forwardToBks: boolean,
    @Body('notes') notes: string,
    @Request() req: any,
  ) {
    const result = await this.service.reviewRiskAcceptanceByCAE(
      +id,
      forwardToBks,
      notes,
      req.user,
    );
    await this.auditTrailService.log({
      action: 'UPDATE',
      resource: 'recommendations',
      resourceId: +id,
      userId: req.user?.userId,
      username: req.user?.username,
      newValue: {
        riskAcceptanceStatus: forwardToBks ? 'PendingBKS' : 'Rejected',
        notes,
      },
    });
    return result;
  }

  @Post(':id/risk-acceptance/approve')
  async approveRiskAcceptance(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Request() req: any,
  ) {
    const result = await this.service.approveRiskAcceptance(+id, notes, req.user);
    await this.auditTrailService.log({
      action: 'UPDATE',
      resource: 'recommendations',
      resourceId: +id,
      userId: req.user?.userId,
      username: req.user?.username,
      newValue: { riskAcceptanceStatus: 'Accepted', notes, closureStatus: 'Closed' },
    });
    return result;
  }

  @Post(':id/risk-acceptance/reject')
  async rejectRiskAcceptance(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Request() req: any,
  ) {
    const result = await this.service.rejectRiskAcceptance(+id, notes, req.user);
    await this.auditTrailService.log({
      action: 'UPDATE',
      resource: 'recommendations',
      resourceId: +id,
      userId: req.user?.userId,
      username: req.user?.username,
      newValue: { riskAcceptanceStatus: 'Rejected', notes },
    });
    return result;
  }

  @Delete(':id')
  @CheckPolicies((ability) => ability.can(Action.Delete, 'Recommendation'))
  async remove(@Param('id') id: string, @Request() req: any) {
    await this.auditTrailService.log({
      action: 'DELETE',
      resource: 'recommendations',
      resourceId: +id,
      userId: req.user?.userId,
      username: req.user?.username,
    });
    return this.service.remove(+id, req.user);
  }
}
