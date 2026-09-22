import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  BadRequestException,
  Res,
  UseInterceptors,
  UploadedFile,
  Query,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { FileInterceptor } from '../common/interceptors/fastify-file-interceptor';

import { WorkingPapersService } from './working-papers.service';
import { WorkingPapersDataExchangeService } from './working-papers-data-exchange.service';
import { CreateWorkingPaperDto } from './dto/create-working-paper.dto';
import { UpdateWorkingPaperDto } from './dto/update-working-paper.dto';
import {
  ApproveWorkingPaperDto,
  ReworkWorkingPaperDto,
} from './dto/review-working-paper.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/casl-ability.factory';
import { WorkingPaper } from './entities/working-paper.entity';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { excelUploadOptions } from '../common/security/upload-options';
import {
  CurrentUser,
  JwtPayload,
} from '../auth/decorators/current-user.decorator';

@Controller('working-papers')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class WorkingPapersController {
  private readonly logger = new Logger(WorkingPapersController.name);

  constructor(
    private readonly workingPapersService: WorkingPapersService,
    private readonly dataExchangeService: WorkingPapersDataExchangeService,
    private readonly auditTrailService: AuditTrailService,
    @InjectQueue('working-papers') private readonly wpQueue: Queue,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can(Action.Create, WorkingPaper))
  async create(
    @Body() dto: CreateWorkingPaperDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.workingPapersService.create(dto, user);
    await this.auditTrailService.log({
      action: 'CREATE',
      resource: 'working-papers',
      resourceId: (result as any)?.id,
      userId: user.userId,
      username: user.username,
      newValue: { title: dto.title },
    });
    return result;
  }

  @Get()
  @CheckPolicies((ability) => ability.can(Action.Read, WorkingPaper))
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('type') type?: string,
    @Query('engagementId') engagementId?: string,
    @Query('assignedOnly') assignedOnly?: string,
    @Query('status') status?: string,
  ) {
    return this.workingPapersService.findAll(
      user,
      type,
      engagementId ? +engagementId : undefined,
      assignedOnly === 'true' || assignedOnly === '1',
      status,
    );
  }

  @Get('template/credit-excel')
  async downloadCreditTemplate(@Res() res: any) {
    const buffer = await this.dataExchangeService.generateCreditTemplate();
    res.header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.header(
      'Content-Disposition',
      'attachment; filename=Template_WP_TinDung_40Cot_ThucTe.xlsx',
    );
    res.send(buffer);
  }

  @Get('template/ptd-excel')
  async downloadPtdTemplate(@Res() res: any) {
    const buffer = await this.dataExchangeService.generatePtdTemplate();
    res.header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.header(
      'Content-Disposition',
      'attachment; filename=Template_WP_PhiTinDung_20Cot_ThucTe.xlsx',
    );
    res.send(buffer);
  }

  @Get(':id')
  @CheckPolicies((ability) => ability.can(Action.Read, WorkingPaper))
  findOne(@Param('id') id: string) {
    return this.workingPapersService.findOne(+id);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can(Action.Update, WorkingPaper))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkingPaperDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.workingPapersService.update(+id, dto, user);
    await this.auditTrailService.log({
      action: 'UPDATE',
      resource: 'working-papers',
      resourceId: +id,
      userId: user.userId,
      username: user.username,
      newValue: dto,
    });

    return result;
  }

  /** KTV gửi WP để soát xét → status: Submitted */
  @Post(':id/submit')
  @CheckPolicies((ability) => ability.can(Action.Update, WorkingPaper))
  submit(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.workingPapersService.submitForReview(+id, user);
  }

  /** Trưởng đoàn duyệt WP → status: Approved */
  @Post(':id/approve')
  @CheckPolicies((ability) => ability.can(Action.Update, WorkingPaper))
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveWorkingPaperDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workingPapersService.approve(+id, dto.notes || '', user);
  }

  /** Trưởng đoàn trả lại WP yêu cầu sửa → status: Rework */
  @Post(':id/reject')
  @Post(':id/rework')
  @CheckPolicies((ability) => ability.can(Action.Update, WorkingPaper))
  reject(
    @Param('id') id: string,
    @Body() dto: ReworkWorkingPaperDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workingPapersService.requestRework(+id, dto.notes, user);
  }

  @Delete(':id')
  @CheckPolicies((ability) => ability.can(Action.Delete, WorkingPaper))
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.auditTrailService.log({
      action: 'DELETE',
      resource: 'working-papers',
      resourceId: +id,
      userId: user.userId,
      username: user.username,
    });
    return this.workingPapersService.remove(+id);
  }

  // ═══════════════════════════════════════════════════════════════
  // ENDPOINTS NHẬP / XUẤT EXCEL 40 CỘT TÍN DỤNG VÀ 20 CỘT PTD
  // ═══════════════════════════════════════════════════════════════

  /** Import file Excel 40 cột Tín dụng thực tế */
  @Post(':id/import-credit-excel')
  @CheckPolicies((ability) => ability.can(Action.Update, WorkingPaper))
  @UseInterceptors(FileInterceptor('file', excelUploadOptions))
  async importCreditExcel(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Vui lòng upload file Excel Working Paper Tín dụng',
      );
    }
    const fileData = file.buffer || file.path;
    const result = await this.dataExchangeService.importCreditWorkingPaper(
      +id,
      fileData,
      user,
    );
    await this.auditTrailService.log({
      action: 'UPDATE',
      resource: 'working-papers',
      resourceId: +id,
      userId: user.userId,
      username: user.username,
      newValue: result,
    });
    return result;
  }

  /** Xuất file Excel 40 cột Tín dụng thực tế */
  @Get(':id/export-credit-excel')
  @CheckPolicies((ability) => ability.can(Action.Read, WorkingPaper))
  async exportCreditExcel(@Param('id') id: string, @Res() res: any) {
    const buffer = await this.dataExchangeService.exportCreditWorkingPaper(+id);
    res.header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.header(
      'Content-Disposition',
      `attachment; filename=WP_TD_CN_Export_${id}.xlsx`,
    );
    res.send(buffer);
  }

  /** Import file Excel 20 cột Phi tín dụng & Khắc phục thực tế */
  @Post(':id/import-ptd-excel')
  @CheckPolicies((ability) => ability.can(Action.Update, WorkingPaper))
  @UseInterceptors(FileInterceptor('file', excelUploadOptions))
  async importPtdExcel(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Vui lòng upload file Excel Working Paper Phi tín dụng',
      );
    }
    const fileData = file.buffer || file.path;
    const result = await this.dataExchangeService.importPtdWorkingPaper(
      +id,
      fileData,
      user,
    );
    await this.auditTrailService.log({
      action: 'UPDATE',
      resource: 'working-papers',
      resourceId: +id,
      userId: user.userId,
      username: user.username,
      newValue: result,
    });
    return result;
  }

  /** Xuất file Excel 20 cột Phi tín dụng & Khắc phục thực tế */
  @Get(':id/export-ptd-excel')
  @CheckPolicies((ability) => ability.can(Action.Read, WorkingPaper))
  async exportPtdExcel(@Param('id') id: string, @Res() res: any) {
    const buffer = await this.dataExchangeService.exportPtdWorkingPaper(+id);
    res.header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.header(
      'Content-Disposition',
      `attachment; filename=WP_PTD_Export_${id}.xlsx`,
    );
    res.send(buffer);
  }

  @Get(':id/export-excel')
  @CheckPolicies((ability) => ability.can(Action.Read, WorkingPaper))
  async exportExcel(@Param('id') id: string, @Res() res: any) {
    try {
      const buffer = await this.workingPapersService.generateExcel(+id);
      res.header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.header(
        'Content-Disposition',
        `attachment; filename=WorkingPaper_${id}.xlsx`,
      );
      res.send(buffer);
    } catch (error: any) {
      this.logger.error(`Lỗi xuất Excel WP #${id}`, error);
      res.status(500).send({ message: error.message || 'Lỗi xuất file Excel' });
    }
  }

  @Post(':id/import-excel')
  @CheckPolicies((ability) => ability.can(Action.Update, WorkingPaper))
  @UseInterceptors(FileInterceptor('file', excelUploadOptions))
  async importExcel(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng upload file Excel');
    }

    const filePayload = file._buf || file.buffer || file.path;
    const result = await this.workingPapersService.importSyncOffline(
      +id,
      filePayload,
      user,
    );

    return {
      success: true,
      message: 'Đồng bộ Excel ngoại tuyến thành công!',
      data: result,
    };
  }

  @Get(':id/export/word')
  @CheckPolicies((ability) => ability.can(Action.Read, WorkingPaper))
  async exportWord(@Param('id') id: string, @Res() res: any) {
    try {
      const buffer = await this.workingPapersService.generateWord(+id);
      res.header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      res.header(
        'Content-Disposition',
        `attachment; filename=WorkingPaper_${id}.docx`,
      );
      res.send(buffer);
    } catch (error: any) {
      this.logger.error(`Lỗi xuất Word WP #${id}`, error);
      res.status(500).send({ message: error.message || 'Lỗi xuất file Word' });
    }
  }
}
