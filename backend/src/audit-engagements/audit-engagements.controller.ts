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
import { AuditEngagementsService } from './audit-engagements.service';
import { CreateAuditEngagementDto } from './dto/create-audit-engagement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/casl-ability.factory';
import { AuditEngagement } from './entities/audit-engagement.entity';

@Controller('audit-engagements')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class AuditEngagementsController {
  constructor(private readonly service: AuditEngagementsService) {}

  @Post()
  @CheckPolicies((ability) => ability.can(Action.Create, AuditEngagement))
  create(@Body() createDto: CreateAuditEngagementDto) {
    return this.service.create(createDto);
  }

  @Get()
  @CheckPolicies((ability) => ability.can(Action.Read, AuditEngagement))
  findAll(
    @Request() req: any,
    @Query('planId') planId?: string,
    @Query('status') status?: string,
    @Query('engagementType') engagementType?: string,
    @Query('ownerTeam') ownerTeam?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.service.findAll(req.user, {
      planId: planId ? parseInt(planId, 10) : undefined,
      status: status || undefined,
      engagementType: engagementType || undefined,
      ownerTeam: ownerTeam || undefined,
      departmentId: departmentId || undefined,
    });
  }

  // --- Change Requests ---
  @Get('change-requests')
  @CheckPolicies((ability) => ability.can(Action.Read, AuditEngagement))
  getChangeRequests(@Query('status') status?: string) {
    return this.service.getChangeRequests(status);
  }

  @Post(':id/change-requests')
  @CheckPolicies((ability) => ability.can(Action.Update, AuditEngagement))
  createChangeRequest(
    @Param('id') id: string,
    @Body() payload: any,
    @Request() req: any,
  ) {
    return this.service.createChangeRequest(
      +id,
      req.user?.userId,
      req.user?.username,
      payload,
    );
  }

  @Post('change-requests/:reqId/approve')
  @CheckPolicies((ability) => ability.can(Action.Manage, AuditEngagement))
  approveChangeRequest(@Param('reqId') reqId: string, @Request() req: any) {
    return this.service.approveChangeRequest(
      +reqId,
      req.user?.userId,
      req.user?.username,
    );
  }

  @Post('change-requests/:reqId/reject')
  @CheckPolicies((ability) => ability.can(Action.Manage, AuditEngagement))
  rejectChangeRequest(
    @Param('reqId') reqId: string,
    @Body('reviewNotes') reviewNotes: string,
    @Request() req: any,
  ) {
    return this.service.rejectChangeRequest(
      +reqId,
      req.user?.userId,
      req.user?.username,
      reviewNotes,
    );
  }

  @Get(':id/export/plan-word')
  @CheckPolicies((ability) => ability.can(Action.Read, AuditEngagement))
  async exportPlanWord(
    @Param('id') id: string,
    @Query('type') type: string,
    @Res() res: any,
  ) {
    const buffer = await this.service.generatePlanWord(+id, type);
    const prefix = type ? `${type}_` : 'KHKT_';
    res.headers({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename=${prefix}${id}.docx`,
    });
    res.send(buffer);
  }

  @Post(':id/officialize')
  @CheckPolicies((ability) => ability.can(Action.Update, AuditEngagement))
  async officialize(
    @Param('id') id: string,
    @Body() payload: any,
    @Request() req: any,
  ) {
    return this.service.officializeEngagement(+id, payload, req.user);
  }

  @Post(':id/submit-proposal')
  @CheckPolicies((ability) => ability.can(Action.Update, AuditEngagement))
  submitProposal(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Request() req: any,
  ) {
    return this.service.submitProposal(+id, req.user, notes);
  }

  @Post(':id/approve-proposal')
  @CheckPolicies((ability) => ability.can(Action.Manage, AuditEngagement))
  approveProposal(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Request() req: any,
  ) {
    return this.service.approveProposal(+id, req.user, notes);
  }

  @Post(':id/reject-proposal')
  @CheckPolicies((ability) => ability.can(Action.Manage, AuditEngagement))
  rejectProposal(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Request() req: any,
  ) {
    return this.service.rejectProposal(+id, notes, req.user);
  }

  @Get(':id')
  @CheckPolicies((ability) => ability.can(Action.Read, AuditEngagement))
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Get(':id/workstreams')
  @CheckPolicies((ability) => ability.can(Action.Read, AuditEngagement))
  findWorkstreams(@Param('id') id: string, @Request() req: any) {
    return this.service.findWorkstreams(+id, req.user);
  }

  @Post(':id/workstreams')
  @CheckPolicies((ability) => ability.can(Action.Update, AuditEngagement))
  createWorkstream(
    @Param('id') id: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.service.createWorkstream(+id, dto, req.user);
  }

  @Post(':id/request-close')
  @CheckPolicies((ability) => ability.can(Action.Update, AuditEngagement))
  requestClose(
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @Request() req: any,
  ) {
    return this.service.requestClose(+id, body?.notes || '', req.user);
  }

  @Post(':id/close')
  @CheckPolicies((ability) => ability.can(Action.Manage, AuditEngagement))
  closeWorkspace(
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @Request() req: any,
  ) {
    return this.service.closeWorkspace(+id, body?.notes || '', req.user);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can(Action.Update, AuditEngagement))
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.service.update(+id, updateDto);
  }

  @Delete(':id')
  @CheckPolicies((ability) => ability.can(Action.Delete, AuditEngagement))
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }

  @Patch('/workstreams/:id')
  @CheckPolicies((ability) => ability.can(Action.Update, AuditEngagement))
  updateWorkstream(
    @Param('id') id: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.service.updateWorkstream(+id, dto, req.user);
  }

  @Delete('/workstreams/:id')
  @CheckPolicies((ability) => ability.can(Action.Delete, AuditEngagement))
  deleteWorkstream(@Param('id') id: string, @Request() req: any) {
    return this.service.deleteWorkstream(+id, req.user);
  }

  @Post('/workstreams/:id/complete')
  @CheckPolicies((ability) => ability.can(Action.Update, AuditEngagement))
  completeWorkstream(@Param('id') id: string, @Request() req: any) {
    return this.service.completeWorkstream(+id, req.user);
  }

  @Post('/workstreams/:id/review')
  @CheckPolicies((ability) => ability.can(Action.Manage, AuditEngagement))
  reviewWorkstream(
    @Param('id') id: string,
    @Body() dto: { status: string; reviewNotes?: string },
    @Request() req: any,
  ) {
    return this.service.reviewWorkstream(+id, dto, req.user);
  }
}
