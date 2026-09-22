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

@Controller('regulatory-exams')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class RegulatoryExamsController {
  constructor(private readonly service: RegulatoryExamsService) {}

  @Get()
  @CheckPolicies((ability) => ability.can(Action.Read, 'RegulatoryExam'))
  findAllExams() {
    return this.service.findAllExams();
  }

  @Post()
  @CheckPolicies((ability) => ability.can(Action.Create, 'RegulatoryExam'))
  createExam(@Body() data: any) {
    return this.service.createExam(data);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can(Action.Update, 'RegulatoryExam'))
  updateExam(@Param('id') id: string, @Body() data: any) {
    return this.service.updateExam(+id, data);
  }

  @Delete(':id')
  @CheckPolicies((ability) => ability.can(Action.Delete, 'RegulatoryExam'))
  deleteExam(@Param('id') id: string) {
    return this.service.deleteExam(+id);
  }

  @Post(':id/findings')
  @CheckPolicies((ability) => ability.can(Action.Create, 'RegulatoryExam'))
  createFinding(@Param('id') examId: string, @Body() data: any) {
    return this.service.createFinding({ ...data, examId: +examId });
  }

  @Patch('findings/:findingId')
  @CheckPolicies((ability) => ability.can(Action.Update, 'RegulatoryExam'))
  updateFinding(@Param('findingId') findingId: string, @Body() data: any) {
    return this.service.updateFinding(+findingId, data);
  }

  @Delete('findings/:findingId')
  @CheckPolicies((ability) => ability.can(Action.Delete, 'RegulatoryExam'))
  deleteFinding(@Param('findingId') findingId: string) {
    return this.service.deleteFinding(+findingId);
  }
}
