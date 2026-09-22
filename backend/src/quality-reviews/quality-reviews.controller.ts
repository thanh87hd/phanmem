import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { QualityReviewsService } from './quality-reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('quality-reviews')
export class QualityReviewsController {
  constructor(private readonly service: QualityReviewsService) {}

  @Post()
  create(@Body() createDto: any) {
    return this.service.create(createDto);
  }

  @Get()
  findAll(@Query('workingPaperId') workingPaperId?: string) {
    if (workingPaperId) {
      return this.service.findByWorkingPaper(+workingPaperId);
    }
    return this.service.findAll();
  }

  @Post('assessments')
  createAssessment(@Body() dto: any) {
    return this.service.createAssessment(dto);
  }

  @Get('assessments')
  findAllAssessments() {
    return this.service.findAllAssessments();
  }

  @Get('assessments/stats')
  getOverallQualityStats() {
    return this.service.getOverallQualityStats();
  }

  @Get('assessments/:id/export')
  async exportAssessment(@Param('id') id: string, @Res() res: any) {
    const assessment = await this.service.findOneAssessment(+id);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('MB05_Danh_Gia_Chat_Luong');
    sheet.columns = [
      { header: 'STT', key: 'stt', width: 10 },
      { header: 'Tiêu chí đánh giá chất lượng', key: 'criteria', width: 45 },
      { header: 'Điểm số', key: 'score', width: 15 },
      { header: 'Nhận xét / Khuyến nghị', key: 'notes', width: 50 },
    ];
    sheet.addRow({
      stt: 1,
      criteria: 'Kế hoạch kiểm toán (Planning)',
      score: assessment?.criteriaScores?.planning || 10,
      notes: 'Đạt yêu cầu chuẩn mực IIA',
    });
    sheet.addRow({
      stt: 2,
      criteria: 'Thực thi kiểm toán (Execution)',
      score: assessment?.criteriaScores?.execution || 10,
      notes: 'Thực hiện đầy đủ mẫu kiểm toán',
    });
    sheet.addRow({
      stt: 3,
      criteria: 'Báo cáo kiểm toán (Reporting)',
      score: assessment?.criteriaScores?.reporting || 10,
      notes: 'Đúng mẫu biểu MB01B/MB03B',
    });
    sheet.addRow({
      stt: 4,
      criteria: 'Hồ sơ & Giấy tờ làm việc (Documentation)',
      score: assessment?.criteriaScores?.documentation || 10,
      notes: 'Lưu trữ đầy đủ bằng chứng',
    });
    sheet.addRow({
      stt: 'TỔNG',
      criteria: 'Điểm đánh giá tổng hợp',
      score: assessment?.overallScore || 40,
      notes: assessment?.rating || 'Good',
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.header(
      'Content-Disposition',
      `attachment; filename="Phieu_Danh_gia_MB05_${id}.xlsx"`,
    );
    res.send(buffer);
  }

  @Get('assessments/:id')
  findOneAssessment(@Param('id') id: string) {
    return this.service.findOneAssessment(+id);
  }

  @Delete('assessments/:id')
  deleteAssessment(@Param('id') id: string) {
    return this.service.deleteAssessment(+id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const parsedId = +id;
    if (isNaN(parsedId)) {
      return null;
    }
    return this.service.findOne(parsedId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    const parsedId = +id;
    if (isNaN(parsedId)) {
      return null;
    }
    return this.service.update(parsedId, updateDto);
  }

  @Patch(':id/transition')
  transition(
    @Param('id') id: string,
    @Body()
    body: {
      level: 'self' | 'supervisor' | 'independent';
      status: string;
      notes?: string;
      userId?: number;
      userName?: string;
    },
  ) {
    const parsedId = +id;
    if (isNaN(parsedId)) {
      return null;
    }
    return this.service.transition(
      parsedId,
      body.level,
      body.status,
      body.notes,
      body.userId,
      body.userName,
    );
  }

  @Get('actions/:entityType/:entityId')
  findActions(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.service.findActionsByEntity(entityType, +entityId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    const parsedId = +id;
    if (isNaN(parsedId)) {
      return null;
    }
    return this.service.remove(parsedId);
  }
}
