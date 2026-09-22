import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { QaipService } from './qaip.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/casl-ability.factory';
import { IqaAssessment } from './entities/iqa-assessment.entity';

@Controller('qaip')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class QaipController {
  constructor(private readonly qaipService: QaipService) {}

  @Get()
  @CheckPolicies((ability) => ability.can(Action.Read, 'QAIP'))
  getAll() {
    return this.qaipService.getSurveys();
  }

  @Get('eqa')
  @CheckPolicies((ability) => ability.can(Action.Read, 'QAIP'))
  getEqas() {
    return this.qaipService.getEqas();
  }

  @Post('eqa')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'QAIP'))
  createEqa(@Body() data: any) {
    return this.qaipService.createEqa(data);
  }

  @Get('surveys')
  @CheckPolicies((ability) => ability.can(Action.Read, 'QAIP'))
  getSurveys() {
    return this.qaipService.getSurveys();
  }

  @Post('surveys')
  @CheckPolicies((ability) => ability.can(Action.Create, 'QAIP'))
  createSurvey(@Body() data: any) {
    return this.qaipService.createSurvey(data);
  }

  @Get('surveys/stats')
  @CheckPolicies((ability) => ability.can(Action.Read, 'QAIP'))
  getSurveyStats() {
    return this.qaipService.getSurveyStats();
  }

  // ===== IIA Standard 4.1: IQA Endpoints =====
  @Get('iqa')
  @CheckPolicies((ability) => ability.can(Action.Read, 'QAIP'))
  getIqas(@Query('year') year?: string) {
    return this.qaipService.getIqas(year ? parseInt(year, 10) : undefined);
  }

  @Get('iqa/kpis')
  @CheckPolicies((ability) => ability.can(Action.Read, 'QAIP'))
  getIqaKpis(@Query('year') year?: string) {
    return this.qaipService.getIqaKpis(year ? parseInt(year, 10) : undefined);
  }

  @Get('iqa/:id')
  @CheckPolicies((ability) => ability.can(Action.Read, 'QAIP'))
  getIqa(@Param('id', ParseIntPipe) id: number) {
    return this.qaipService.getIqa(id);
  }

  @Post('iqa')
  @CheckPolicies((ability) => ability.can(Action.Create, 'QAIP'))
  createIqa(@Body() data: Partial<IqaAssessment>, @Req() req: any) {
    return this.qaipService.createIqa(data, req.user);
  }

  @Put('iqa/:id')
  @CheckPolicies((ability) => ability.can(Action.Update, 'QAIP'))
  updateIqa(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<IqaAssessment>,
  ) {
    return this.qaipService.updateIqa(id, data);
  }

  @Delete('iqa/:id')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'QAIP'))
  deleteIqa(@Param('id', ParseIntPipe) id: number) {
    return this.qaipService.deleteIqa(id);
  }
}
