import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { KriBacktestingService } from './kri-backtesting.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BacktestStrategy } from './entities/kri-backtest-result.entity';
import {
  CurrentUser,
  JwtPayload,
} from '../auth/decorators/current-user.decorator';

@Controller('continuous-monitoring/backtesting')
@UseGuards(JwtAuthGuard)
export class KriBacktestingController {
  constructor(private readonly service: KriBacktestingService) {}

  @Get('results')
  getAllResults() {
    return this.service.getAllResults();
  }

  @Get('results/:id')
  getResultById(@Param('id') id: string) {
    return this.service.getResultById(+id);
  }

  @Post('run')
  runBacktest(
    @Body()
    body: {
      ruleCode: string;
      startDate: string;
      endDate: string;
      strategy?: BacktestStrategy;
      testedThresholds?: {
        yellowThreshold: number;
        redThreshold: number;
        comparisonOperator?: string;
      };
    },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.runBacktest({
      ...body,
      user,
    });
  }
}
