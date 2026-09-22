import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ScenarioAnalysisService } from './scenario-analysis.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('scenario-analysis')
export class ScenarioAnalysisController {
  constructor(private readonly scenarioService: ScenarioAnalysisService) {}

  @Get('scenarios')
  async getScenarios() {
    return this.scenarioService.findAllScenarios();
  }

  @Get('scenarios/:scenarioId')
  async getScenario(@Param('scenarioId') scenarioId: string) {
    return this.scenarioService.findScenario(scenarioId);
  }

  @Get('analyses')
  async getAnalyses(@Query('scenarioId') scenarioId?: string) {
    return this.scenarioService.findAnalyses(scenarioId);
  }

  @Get('risk-map/:scenarioId')
  async getRiskMapData(@Param('scenarioId') scenarioId: string) {
    return this.scenarioService.getRiskMapData(scenarioId);
  }

  @Post('calculate-preview')
  async previewMetrics(@Body() body: any) {
    return this.scenarioService.computeRiskMetrics(body);
  }

  @Post('analyses')
  async saveAnalysis(@Body() body: any) {
    return this.scenarioService.createOrUpdateAnalysis(body);
  }
}
