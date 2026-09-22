import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '../common/interceptors/fastify-file-interceptor';
import { AuditSamplesService } from './audit-samples.service';
import {
  CreateSampleBatchDto,
  UpdateSampleBatchDto,
  CreateSampleDto,
  BulkCreateSamplesDto,
  UpdateSampleDto,
  BulkAssignSamplesDto,
} from './dto/audit-sample.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/casl-ability.factory';
import { AuditSample } from './entities/audit-sample.entity';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';

@Controller('audit-samples')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class AuditSamplesController {
  constructor(private readonly samplesService: AuditSamplesService) {}

  // ═══════════════════════ BATCH ENDPOINTS ═══════════════════════

  @Get('batches')
  @CheckPolicies((ability) => ability.can(Action.Read, AuditSample))
  async findAllBatches(
    @Query('engagementId') engagementId?: number,
    @Query('workingPaperId') workingPaperId?: number,
  ) {
    return await this.samplesService.findAllBatches(
      engagementId ? Number(engagementId) : undefined,
      workingPaperId ? Number(workingPaperId) : undefined,
    );
  }

  @Get('batches/:id')
  @CheckPolicies((ability) => ability.can(Action.Read, AuditSample))
  async findOneBatch(@Param('id', ParseIntPipe) id: number) {
    return await this.samplesService.findOneBatch(id);
  }

  @Get('batches/:id/stats')
  @CheckPolicies((ability) => ability.can(Action.Read, AuditSample))
  async getBatchStats(@Param('id', ParseIntPipe) id: number) {
    return await this.samplesService.getBatchStats(id);
  }

  @Get('batches/:id/analytics')
  @CheckPolicies((ability) => ability.can(Action.Read, AuditSample))
  async getBatchAnalytics(@Param('id', ParseIntPipe) id: number) {
    return await this.samplesService.getBatchAnalytics(id);
  }

  @Post('batches/:id/auto-verify')
  @CheckPolicies((ability) => ability.can(Action.Update, AuditSample))
  async autoVerifyBatch(@Param('id', ParseIntPipe) id: number) {
    return await this.samplesService.autoVerifyBatch(id);
  }

  @Post('batches/:id/auto-generate')
  @CheckPolicies((ability) => ability.can(Action.Create, AuditSample))
  async autoGenerateSamples(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: any,
  ) {
    return await this.samplesService.autoGenerateSamples(id, dto);
  }

  @Post('batches')
  @CheckPolicies((ability) => ability.can(Action.Create, AuditSample))
  async createBatch(@Body() dto: CreateSampleBatchDto) {
    return await this.samplesService.createBatch(dto);
  }

  @Patch('batches/:id')
  @CheckPolicies((ability) => ability.can(Action.Update, AuditSample))
  async updateBatch(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSampleBatchDto,
  ) {
    return await this.samplesService.updateBatch(id, dto);
  }

  @Delete('batches/:id')
  @CheckPolicies((ability) => ability.can(Action.Delete, AuditSample))
  async removeBatch(@Param('id', ParseIntPipe) id: number) {
    await this.samplesService.removeBatch(id);
    return { success: true };
  }

  // ═══════════════════════ SAMPLE ENDPOINTS ═══════════════════════

  @Post('batches/:batchId/samples')
  @CheckPolicies((ability) => ability.can(Action.Create, AuditSample))
  async addSample(
    @Param('batchId', ParseIntPipe) batchId: number,
    @Body() dto: CreateSampleDto,
  ) {
    return await this.samplesService.addSample(batchId, dto);
  }

  @Post('batches/:batchId/upload-samples')
  @CheckPolicies((ability) => ability.can(Action.Create, AuditSample))
  async addSamplesBulk(
    @Param('batchId', ParseIntPipe) batchId: number,
    @Body() dto: BulkCreateSamplesDto,
  ) {
    return await this.samplesService.addSamplesBulk(batchId, dto);
  }

  @Post('batches/:batchId/import')
  @CheckPolicies((ability) => ability.can(Action.Create, AuditSample))
  @UseInterceptors(FileInterceptor('file'))
  async importSamples(
    @Param('batchId', ParseIntPipe) batchId: number,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      return { success: false, message: 'Vui lòng chọn file Excel để import.' };
    }

    const workbook = new ExcelJS.Workbook();
    if (file?.path && fs.existsSync(file.path)) {
      await workbook.xlsx.readFile(file.path);
    } else if (file?._buf || file?.buffer) {
      await workbook.xlsx.load(file._buf || file.buffer);
    } else if (Buffer.isBuffer(file)) {
      await workbook.xlsx.load(file as any);
    } else {
      return { success: false, message: 'Dữ liệu file không hợp lệ.' };
    }
    const sheet = workbook.worksheets[0];
    const rows: any[] = [];
    let headers: string[] = [];
    sheet.eachRow((row, rIdx) => {
      const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
      if (rIdx === 1) {
        headers = vals.map((v) =>
          v !== null && v !== undefined ? (v as any).toString() : '',
        );
      } else {
        const obj: any = {};
        headers.forEach((h, i) => (obj[h] = vals[i]));
        rows.push(obj);
      }
    });

    const result = await this.samplesService.importSamplesFromParsedData(
      batchId,
      rows,
    );
    return {
      success: true,
      message: `Đã import thành công ${result.imported} mẫu kiểm toán.`,
      imported: result.imported,
    };
  }

  @Patch(':sampleId')
  @CheckPolicies((ability) => ability.can(Action.Update, AuditSample))
  async updateSample(
    @Param('sampleId', ParseIntPipe) sampleId: number,
    @Body() dto: UpdateSampleDto,
  ) {
    return await this.samplesService.updateSample(sampleId, dto);
  }

  @Patch('samples/:sampleId')
  @CheckPolicies((ability) => ability.can(Action.Update, AuditSample))
  async updateSampleAlias(
    @Param('sampleId', ParseIntPipe) sampleId: number,
    @Body() dto: UpdateSampleDto,
  ) {
    return await this.samplesService.updateSample(sampleId, dto);
  }

  @Delete(':sampleId')
  @CheckPolicies((ability) => ability.can(Action.Delete, AuditSample))
  async removeSample(@Param('sampleId', ParseIntPipe) sampleId: number) {
    await this.samplesService.removeSample(sampleId);
    return { success: true };
  }

  // ═══════════════════════ QUERY ENDPOINTS ═══════════════════════

  @Get('by-engagement/:engagementId')
  @CheckPolicies((ability) => ability.can(Action.Read, AuditSample))
  async findByEngagement(
    @Param('engagementId', ParseIntPipe) engagementId: number,
  ) {
    return await this.samplesService.findSamplesByEngagement(engagementId);
  }

  @Get('by-working-paper/:workingPaperId')
  @CheckPolicies((ability) => ability.can(Action.Read, AuditSample))
  async findByWorkingPaper(
    @Param('workingPaperId', ParseIntPipe) workingPaperId: number,
  ) {
    return await this.samplesService.findSamplesByWorkingPaper(workingPaperId);
  }

  @Post('by-working-paper/:workingPaperId')
  @CheckPolicies((ability) => ability.can(Action.Create, AuditSample))
  async addSampleByWorkingPaper(
    @Param('workingPaperId', ParseIntPipe) workingPaperId: number,
    @Body() dto: any,
    @Req() req: any,
  ) {
    return await this.samplesService.addSampleByWorkingPaper(
      workingPaperId,
      dto,
      req?.user,
    );
  }

  @Get('by-finding/:findingId')
  @CheckPolicies((ability) => ability.can(Action.Read, AuditSample))
  async findByFinding(@Param('findingId', ParseIntPipe) findingId: number) {
    return await this.samplesService.findSamplesByFinding(findingId);
  }

  @Get('by-auditor/:auditorId')
  @CheckPolicies((ability) => ability.can(Action.Read, AuditSample))
  async findByAuditor(
    @Param('auditorId', ParseIntPipe) auditorId: number,
    @Query('engagementId') engagementId?: string,
  ) {
    return await this.samplesService.findSamplesByAuditor(
      auditorId,
      engagementId ? parseInt(engagementId, 10) : undefined,
    );
  }

  @Post('batches/:batchId/request-change')
  @CheckPolicies((ability) => ability.can(Action.Update, AuditSample))
  async requestSampleChange(
    @Param('batchId', ParseIntPipe) batchId: number,
    @Body()
    body: { changeReason: string; auditorId: number; auditorName: string },
  ) {
    return await this.samplesService.requestSampleChange(
      batchId,
      body.changeReason,
      body.auditorId,
      body.auditorName,
    );
  }

  @Post('batches/:batchId/approve-change')
  @CheckPolicies((ability) => ability.can(Action.Manage, AuditSample))
  async approveSampleChange(
    @Param('batchId', ParseIntPipe) batchId: number,
    @Body() body: { status: 'Approved' | 'Rejected'; approverName: string },
  ) {
    return await this.samplesService.approveSampleChange(
      batchId,
      body.status,
      body.approverName,
    );
  }

  // ═══════════════════════ EXPORT EXCEL ═══════════════════════

  /**
   * Xuất Excel bảng kê mẫu kiểm toán theo cuộc kiểm toán.
   * Nếu > 1000 dòng, tự chia sheet. Hỗ trợ lọc theo operationType.
   */
  @Get('export/excel/:engagementId')
  @CheckPolicies((ability) => ability.can(Action.Read, AuditSample))
  async exportExcel(
    @Param('engagementId', ParseIntPipe) engagementId: number,
    @Query('operationType') operationType: string,
    @Res() res: any,
  ) {
    const buffer = await this.samplesService.exportExcel(
      engagementId,
      operationType || undefined,
    );
    const typePrefix = operationType ? `${operationType}_` : '';
    res.headers({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=Bang_ke_mau_${typePrefix}${engagementId}.xlsx`,
    });
    res.send(buffer);
  }

  @Get('template/excel')
  @CheckPolicies((ability) => ability.can(Action.Read, AuditSample))
  async downloadTemplate(
    @Query('engagementId') engagementId: number,
    @Res() res: any,
  ) {
    const buffer = await this.samplesService.generateSampleTemplate(
      engagementId ? Number(engagementId) : undefined,
    );
    res.headers({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=Mau_nhap_lieu_chon_mau.xlsx',
    });
    res.send(buffer);
  }

  @Post('bulk-assign')
  @CheckPolicies((ability) => ability.can(Action.Update, AuditSample))
  async bulkAssignSamples(@Body() dto: BulkAssignSamplesDto) {
    return await this.samplesService.bulkAssignSamples(
      dto.sampleIds,
      dto.assignedAuditorId,
      dto.assignedAuditorName,
    );
  }
}
