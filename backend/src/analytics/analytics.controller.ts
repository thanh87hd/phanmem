import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '../common/interceptors/fastify-file-interceptor';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/casl-ability.factory';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('execute')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'Analytics'))
  @UseInterceptors(FileInterceptor('file'))
  async executeScript(
    @Body() { script, type }: { script?: string; type: string },
    @UploadedFile() file?: any,
  ) {
    if (!file && !type) {
      throw new BadRequestException(
        'Vui lòng chọn loại phân tích và tải file dữ liệu lên',
      );
    }
    return this.analyticsService.executeScript(type, file);
  }

  @Get('history')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'Analytics'))
  async getHistory() {
    return this.analyticsService.getHistory();
  }
}
