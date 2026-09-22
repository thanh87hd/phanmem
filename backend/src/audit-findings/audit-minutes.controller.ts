import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';

import { AuditMinutesService } from './audit-minutes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('audit-minutes')
@UseGuards(JwtAuthGuard)
export class AuditMinutesController {
  constructor(private readonly auditMinutesService: AuditMinutesService) {}

  @Post()
  create(@Body() createDto: any) {
    return this.auditMinutesService.create(createDto);
  }

  @Post('auto-collate/:engagementId')
  autoCollate(@Param('engagementId') engagementId: string) {
    return this.auditMinutesService.collateFromWorkingPapers(+engagementId);
  }

  @Get()
  findAll(@Query('engagementId') engagementId: string) {
    if (engagementId) {
      return this.auditMinutesService.findAllByEngagement(+engagementId);
    }
    return [];
  }

  @Get(':id/export/word')
  async exportWord(
    @Param('id') id: string,
    @Query('type') type: string,
    @Res() res: any,
  ) {
    const buffer = await this.auditMinutesService.generateWord(+id, type);
    const prefix = type ? `${type}_` : 'MB04_';
    res.headers({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename=Bien_ban_kiem_toan_${prefix}${id}.docx`,
    });
    res.send(buffer);
  }

  @Get(':id/export/excel')
  async exportExcel(
    @Param('id') id: string,
    @Query('type') type: string,
    @Res() res: any,
  ) {
    const buffer = await this.auditMinutesService.generateExcel(+id, type);
    const prefix = type ? `${type}_` : 'Bang_Ke_Doi_Soat_';
    res.headers({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=${prefix}${id}.xlsx`,
    });
    res.send(buffer);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.auditMinutesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.auditMinutesService.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.auditMinutesService.remove(+id);
  }
}
