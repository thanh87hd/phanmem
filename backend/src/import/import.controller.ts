import {
  Controller,
  Post,
  Param,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
  UseGuards,
  Body,
  Res,
  Req,
} from '@nestjs/common';

import { FileInterceptor } from '../common/interceptors/fastify-file-interceptor';
import { ImportService } from './import.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { excelUploadOptions } from '../common/security/upload-options';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import {
  CurrentUser,
  JwtPayload,
} from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('import')
export class ImportController {
  constructor(
    private readonly importService: ImportService,
    private readonly auditTrailService: AuditTrailService,
  ) {}

  @Post(':module')
  @UseInterceptors(FileInterceptor('file', excelUploadOptions))
  async uploadFile(
    @Param('module') module: string,
    @UploadedFile() file: any,
    @CurrentUser() user: JwtPayload,
    @Req() req: any,
  ) {
    if (!file) {
      throw new HttpException('File is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.importService.importData(module, file.buffer);

      // Record Audit Trail for Bulk Import
      try {
        await this.auditTrailService.log({
          action: 'CREATE',
          resource: `bulk-import:${module}`,
          resourceId: module,
          userId: user.userId,
          username: user.username || 'system',
          newValue: {
            module,
            fileName: file.filename || file.originalname || 'upload.xlsx',
            successCount: result?.success || 0,
            errorCount: result?.errors?.length || 0,
            errorsSummary: (result?.errors || []).slice(0, 5),
            timestamp: new Date().toISOString(),
          },
          ipAddress: req.ip || req.headers?.['x-forwarded-for'],
          userAgent: req.headers?.['user-agent'],
        });
      } catch (logErr) {
        console.warn('Failed to record bulk import audit trail:', logErr);
      }

      return result;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('export-template')
  async exportTemplate(
    @Body('templateData') templateData: any[],
    @Res() res: any,
  ) {
    if (
      !templateData ||
      !Array.isArray(templateData) ||
      templateData.length === 0
    ) {
      throw new HttpException(
        'Template data is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const buffer = await this.importService.createTemplateExcel(templateData);
      res.header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.header('Content-Disposition', 'attachment; filename="template.xlsx"');
      res.send(buffer);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
