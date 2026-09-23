import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AuditReviewNotesService } from './audit-review-notes.service';
import { CreateReviewNoteDto } from './dto/create-review-note.dto';
import { RespondReviewNoteDto } from './dto/respond-review-note.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { AuditTrailService } from '../audit-trail/audit-trail.service';

@Controller('working-papers/review-notes')
@UseGuards(JwtAuthGuard)
export class AuditReviewNotesController {
  constructor(
    private readonly reviewNotesService: AuditReviewNotesService,
    private readonly auditTrailService: AuditTrailService,
  ) {}

  @Get()
  async findAll(
    @Query('engagementId') engagementId?: string,
    @Query('workingPaperId') workingPaperId?: string,
    @Query('workstreamId') workstreamId?: string,
    @Query('status') status?: string,
  ) {
    return this.reviewNotesService.findAll({
      engagementId: engagementId ? Number(engagementId) : undefined,
      workingPaperId: workingPaperId ? Number(workingPaperId) : undefined,
      workstreamId: workstreamId ? Number(workstreamId) : undefined,
      status,
    });
  }

  @Post()
  async create(
    @Body() dto: CreateReviewNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const res = await this.reviewNotesService.create(dto, user);
    await this.auditTrailService.log({
      action: 'CREATE',
      resource: 'audit-review-notes',
      resourceId: res.id,
      userId: user.userId,
      username: user.username,
      newValue: {
        reviewSeq: res.reviewSeq,
        engagementId: dto.engagementId,
        workingPaperId: dto.workingPaperId,
        workstreamId: dto.workstreamId,
      },
    });
    return res;
  }

  @Post(':id/respond')
  async respond(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RespondReviewNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const res = await this.reviewNotesService.respond(id, dto, user);
    await this.auditTrailService.log({
      action: 'UPDATE',
      resource: 'audit-review-notes',
      resourceId: id,
      userId: user.userId,
      username: user.username,
      newValue: { reviewSeq: res.reviewSeq, status: res.status },
    });
    return res;
  }

  @Post(':id/close')
  async close(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    const res = await this.reviewNotesService.close(id, user);
    await this.auditTrailService.log({
      action: 'SIGN',
      resource: 'audit-review-notes',
      resourceId: id,
      userId: user.userId,
      username: user.username,
      newValue: { reviewSeq: res.reviewSeq, status: res.status },
    });
    return res;
  }
}
