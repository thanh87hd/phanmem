import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { RegulatoryExamsService } from './regulatory-exams.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/casl-ability.factory';
import {
  CreateRegulatoryExamDto,
  UpdateRegulatoryExamDto,
} from './dto/create-regulatory-exam.dto';
import {
  CreateRegulatoryFindingDto,
  UpdateRegulatoryFindingDto,
} from './dto/create-regulatory-finding.dto';

/**
 * ⚠️ LỖI ĐÃ SỬA (TC-BKS-02a): toàn bộ handler trước đây nhận `@Body() data: any`.
 * Không có DTO ⇒ ValidationPipe toàn cục (`whitelist`,
 * `forbidNonWhitelisted`) không có gì để kiểm, nên payload thiếu `title` /
 * `authority` đâm thẳng vào ràng buộc NOT NULL của PostgreSQL và trả về
 * HTTP 500 thay vì 400 kèm thông báo trường lỗi. Client cũng có thể ghi
 * trường tuỳ ý xuống DB.
 */
@Controller('regulatory-exams')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class RegulatoryExamsController {
  constructor(private readonly service: RegulatoryExamsService) {}

  @Get()
  @CheckPolicies((ability) => ability.can(Action.Read, 'RegulatoryExam'))
  findAllExams() {
    return this.service.findAllExams();
  }

  @Get(':id')
  @CheckPolicies((ability) => ability.can(Action.Read, 'RegulatoryExam'))
  findOneExam(@Param('id') id: string) {
    return this.service.findOneExam(+id);
  }

  @Post()
  @CheckPolicies((ability) => ability.can(Action.Create, 'RegulatoryExam'))
  createExam(@Body() data: CreateRegulatoryExamDto) {
    return this.service.createExam(data);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can(Action.Update, 'RegulatoryExam'))
  updateExam(@Param('id') id: string, @Body() data: UpdateRegulatoryExamDto) {
    return this.service.updateExam(+id, data);
  }

  @Delete(':id')
  @CheckPolicies((ability) => ability.can(Action.Delete, 'RegulatoryExam'))
  deleteExam(@Param('id') id: string) {
    return this.service.deleteExam(+id);
  }

  @Post(':id/findings')
  @CheckPolicies((ability) => ability.can(Action.Create, 'RegulatoryExam'))
  createFinding(
    @Param('id') examId: string,
    @Body() data: CreateRegulatoryFindingDto,
  ) {
    return this.service.createFinding({ ...data, examId: +examId });
  }

  @Patch('findings/:findingId')
  @CheckPolicies((ability) => ability.can(Action.Update, 'RegulatoryExam'))
  updateFinding(
    @Param('findingId') findingId: string,
    @Body() data: UpdateRegulatoryFindingDto,
  ) {
    return this.service.updateFinding(+findingId, data);
  }

  @Delete('findings/:findingId')
  @CheckPolicies((ability) => ability.can(Action.Delete, 'RegulatoryExam'))
  deleteFinding(@Param('findingId') findingId: string) {
    return this.service.deleteFinding(+findingId);
  }
}
