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
  Res,
  Query,
  UseInterceptors,
  UploadedFile,
  Logger,
  ParseIntPipe,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtPayload,
} from '../auth/decorators/current-user.decorator';
import { FileInterceptor } from '../common/interceptors/fastify-file-interceptor';
import * as ExcelJS from 'exceljs';

import { AuditFindingsService } from './audit-findings.service';
import { CreateAuditFindingDto } from './dto/create-audit-finding.dto';
import { UpdateAuditFindingDto } from './dto/update-audit-finding.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/casl-ability.factory';
import { AuditFinding } from './entities/audit-finding.entity';

@Controller('audit-findings')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class AuditFindingsController {
  private readonly logger = new Logger(AuditFindingsController.name);

  constructor(private readonly auditFindingsService: AuditFindingsService) {}

  @Post()
  @CheckPolicies((ability) => ability.can(Action.Create, AuditFinding))
  create(
    @Body() createAuditFindingDto: CreateAuditFindingDto,
    @Request() req: any,
  ) {
    return this.auditFindingsService.create(createAuditFindingDto, req.user);
  }

  @Get()
  @CheckPolicies((ability) => ability.can(Action.Read, AuditFinding))
  findAll(@Request() req: any, @Query('engagementId') engagementId?: string) {
    return this.auditFindingsService.findAll(
      req.user,
      engagementId ? +engagementId : undefined,
    );
  }

  @Get('export')
  @CheckPolicies((ability) => ability.can(Action.Read, AuditFinding))
  async exportExcel(@Request() req: any, @Res() res: any) {
    const buffer = await this.auditFindingsService.exportFindingsExcel(
      req.user,
    );
    res.header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.header(
      'Content-Disposition',
      'attachment; filename=Audit_Findings_Export.xlsx',
    );
    res.send(buffer);
  }

  @Get('kpcs-stats')
  @CheckPolicies((ability) => ability.can(Action.Read, AuditFinding))
  getKpcsStats(@Request() req: any) {
    return this.auditFindingsService.getKpcsStats(req.user);
  }

  @Post('upload')
  @CheckPolicies((ability) => ability.can(Action.Create, AuditFinding))
  @UseInterceptors(FileInterceptor('file'))
  async uploadExcel(@UploadedFile() file: any) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw new Error('Excel file is empty');
    }

    const headers: string[] = [];
    let isHeader = true;
    let successCount = 0;

    worksheet.eachRow((row, rowNumber) => {
      if (isHeader) {
        row.eachCell((cell, colNumber) => {
          headers[colNumber] = cell.text.trim();
        });
        isHeader = false;
        return;
      }

      const item: any = {};
      row.eachCell((cell, colNumber) => {
        if (headers[colNumber]) {
          item[headers[colNumber]] = cell.text.trim();
        }
      });

      const payload = {
        findingTitle:
          item['Tiêu đề'] || item['Tóm tắt Phát hiện'] || 'Imported Finding',
        condition: item['Hiện trạng'] || '',
        consequence: item['Hậu quả'] || '',
        cause: item['Nguyên nhân'] || '',
        recommendation: item['Khuyến nghị'] || '',
        riskLevel: item['Mức độ rủi ro'] || 'Medium',
        status: 'Draft',
        findingCategory: 'HoatDong',
        findingNature: 'CaNhan',
      };

      this.auditFindingsService
        .create(payload as any)
        .catch((err) => this.logger.error('Failed to create finding:', err));
      successCount++;
    });

    return { successCount };
  }

  @Get('stats/multi-dimensional')
  @CheckPolicies((ability) => ability.can(Action.Read, AuditFinding))
  getMultiDimensionalStats(
    @CurrentUser() user: JwtPayload,
    @Query('departmentId') departmentId?: string,
    @Query('year') year?: string,
    @Query('auditUniverse') auditUniverse?: string,
  ) {
    return this.auditFindingsService.getMultiDimensionalStats(
      user,
      departmentId,
      year,
      auditUniverse,
    );
  }

  @Get(':id')
  @CheckPolicies((ability) => ability.can(Action.Read, AuditFinding))
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.auditFindingsService.findOne(id);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can(Action.Update, AuditFinding))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAuditFindingDto: UpdateAuditFindingDto,
  ) {
    return this.auditFindingsService.update(id, updateAuditFindingDto);
  }

  @Delete(':id')
  @CheckPolicies((ability) => ability.can(Action.Delete, AuditFinding))
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.auditFindingsService.remove(id);
  }
}
