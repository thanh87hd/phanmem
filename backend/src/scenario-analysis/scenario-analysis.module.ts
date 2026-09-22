import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScenarioRegister } from './entities/scenario-register.entity';
import { RiskScenarioAnalysis } from './entities/risk-scenario-analysis.entity';
import { ScenarioAnalysisService } from './scenario-analysis.service';
import { ScenarioAnalysisController } from './scenario-analysis.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ScenarioRegister, RiskScenarioAnalysis])],
  controllers: [ScenarioAnalysisController],
  providers: [ScenarioAnalysisService],
  exports: [ScenarioAnalysisService],
})
export class ScenarioAnalysisModule {}
