import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { AuditPlansService } from './audit-plans.service';
import { CreateAuditPlanDto } from './dto/create-audit-plan.dto';
import { UpdateAuditPlanDto } from './dto/update-audit-plan.dto';
import { SubmitRevisionDto } from './dto/submit-revision.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtPayload,
} from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('audit-plans')
export class AuditPlansController {
  constructor(private readonly auditPlansService: AuditPlansService) {}

  @Post()
  create(@Body() createAuditPlanDto: CreateAuditPlanDto) {
    return this.auditPlansService.create(createAuditPlanDto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('year') year?: string,
    @Query('status') status?: string,
    @Query('ownerTeam') ownerTeam?: string,
  ) {
    return this.auditPlansService.findAll(user, {
      year: year ? parseInt(year, 10) : undefined,
      status: status || undefined,
      ownerTeam: ownerTeam || undefined,
    });
  }

  @Get('risk-coverage')
  getRiskCoverage(@Query('year') year?: string) {
    return this.auditPlansService.getRiskCoverage(
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Get('universe-with-risk')
  getUniverseWithRisk(@Query('year') year?: string) {
    return this.auditPlansService.getUniverseWithRisk(
      year ? parseInt(year, 10) : new Date().getFullYear(),
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.auditPlansService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAuditPlanDto: UpdateAuditPlanDto,
  ) {
    return this.auditPlansService.update(id, updateAuditPlanDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.auditPlansService.remove(id);
  }

  @Post(':id/submit')
  submit(@Param('id', ParseIntPipe) id: number) {
    return this.auditPlansService.submitPlan(id);
  }

  @Post(':id/approve-l1')
  approveL1(
    @Param('id', ParseIntPipe) id: number,
    @Body('notes') notes: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const reviewerId = user.userId;
    const reviewerName = user.fullName || user.username || 'Trưởng phòng';
    return this.auditPlansService.approveL1(
      id,
      reviewerId,
      reviewerName,
      notes,
    );
  }

  @Post(':id/approve-l2')
  approveL2(
    @Param('id', ParseIntPipe) id: number,
    @Body('notes') notes: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const approverId = user.userId;
    const approverName = user.fullName || user.username || 'Lãnh đạo Khối/BKS';
    return this.auditPlansService.approveL2(
      id,
      approverId,
      approverName,
      notes,
    );
  }

  @Post(':id/approve')
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Body('notes') notes: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const approverId = user.userId;
    const approverName = user.fullName || user.username || 'Người phê duyệt';
    return this.auditPlansService.approvePlan(
      id,
      approverId,
      notes,
      approverName,
    );
  }

  @Post(':id/reject')
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body('notes') notes: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const approverId = user.userId;
    const approverName = user.fullName || user.username || 'Người từ chối';
    return this.auditPlansService.rejectPlan(
      id,
      approverId,
      notes,
      approverName,
    );
  }

  @Post(':id/revisions')
  submitRevision(
    @Param('id', ParseIntPipe) id: number,
    @Body() submitRevisionDto: SubmitRevisionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const userId = user.userId;
    const userName = user.fullName || 'Người phê duyệt';
    return this.auditPlansService.submitRevision(
      id,
      submitRevisionDto,
      userId,
      userName,
    );
  }

  @Post(':id/decompose')
  decompose(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.auditPlansService.decomposeIntoEngagements(id, user);
  }
}
