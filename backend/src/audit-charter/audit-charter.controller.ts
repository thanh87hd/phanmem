import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuditCharterService } from './audit-charter.service';
import { AuditCharter } from './entities/audit-charter.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/casl-ability.factory';

@Controller('audit-charter')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class AuditCharterController {
  constructor(private readonly charterService: AuditCharterService) {}

  @Get()
  @CheckPolicies((ability) => ability.can(Action.Read, 'AuditCharter'))
  findAll(): Promise<AuditCharter[]> {
    return this.charterService.findAll();
  }

  @Get('current')
  @CheckPolicies((ability) => ability.can(Action.Read, 'AuditCharter'))
  findCurrent(): Promise<AuditCharter | null> {
    return this.charterService.findCurrentApproved();
  }

  @Get(':id')
  @CheckPolicies((ability) => ability.can(Action.Read, 'AuditCharter'))
  findOne(@Param('id', ParseIntPipe) id: number): Promise<AuditCharter> {
    return this.charterService.findOne(id);
  }

  @Post()
  @CheckPolicies((ability) => ability.can(Action.Create, 'AuditCharter'))
  create(
    @Body() dto: Partial<AuditCharter>,
    @Req() req: any,
  ): Promise<AuditCharter> {
    return this.charterService.create(dto, req.user);
  }

  @Put(':id')
  @CheckPolicies((ability) => ability.can(Action.Update, 'AuditCharter'))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<AuditCharter>,
  ): Promise<AuditCharter> {
    return this.charterService.update(id, dto);
  }

  @Post(':id/submit')
  @CheckPolicies((ability) => ability.can(Action.Update, 'AuditCharter'))
  submitForApproval(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<AuditCharter> {
    return this.charterService.submitForApproval(id, req.user);
  }

  @Post(':id/approve')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'AuditCharter'))
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Body('notes') notes: string,
    @Req() req: any,
  ): Promise<AuditCharter> {
    return this.charterService.approve(id, req.user, notes);
  }

  @Post(':id/reject')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'AuditCharter'))
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body('notes') notes: string,
    @Req() req: any,
  ): Promise<AuditCharter> {
    return this.charterService.reject(id, req.user, notes);
  }

  @Post(':id/new-version')
  @CheckPolicies((ability) => ability.can(Action.Create, 'AuditCharter'))
  createNewVersion(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<AuditCharter> {
    return this.charterService.createNewVersion(id, req.user);
  }

  @Delete(':id')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'AuditCharter'))
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.charterService.remove(id);
  }
}
