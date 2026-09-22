import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScenarioRegister } from './entities/scenario-register.entity';
import { RiskScenarioAnalysis } from './entities/risk-scenario-analysis.entity';

@Injectable()
export class ScenarioAnalysisService {
  constructor(
    @InjectRepository(ScenarioRegister)
    private readonly scenarioRepo: Repository<ScenarioRegister>,
    @InjectRepository(RiskScenarioAnalysis)
    private readonly analysisRepo: Repository<RiskScenarioAnalysis>,
  ) {}

  async findAllScenarios(): Promise<ScenarioRegister[]> {
    return await this.scenarioRepo.find({ order: { severity: 'ASC' } });
  }

  async findScenario(scenarioId: string): Promise<ScenarioRegister> {
    const scn = await this.scenarioRepo.findOne({ where: { scenarioId } });
    if (!scn) {
      throw new NotFoundException(`Scenario ${scenarioId} not found`);
    }
    return scn;
  }

  async findAnalyses(scenarioId?: string): Promise<RiskScenarioAnalysis[]> {
    if (scenarioId) {
      return await this.analysisRepo.find({
        where: { scenarioId },
        order: { scenarioResidualScore: 'DESC' },
      });
    }
    return await this.analysisRepo.find({
      order: { scenarioResidualScore: 'DESC' },
    });
  }

  computeRiskMetrics(input: {
    baseImpact: number;
    baseLikelihood: number;
    scenarioImpact: number;
    scenarioLikelihood: number;
    appetiteThreshold?: number;
  }) {
    const bImp = Number(input.baseImpact) || 2;
    const bLik = Number(input.baseLikelihood) || 2;
    const baseResidualScore = Number((bImp * bLik).toFixed(1));

    const sImp = Number(input.scenarioImpact) || 3;
    const sLik = Number(input.scenarioLikelihood) || 3;
    const scenarioResidualScore = Number((sImp * sLik).toFixed(1));

    const deltaResidual = Number(
      (scenarioResidualScore - baseResidualScore).toFixed(1),
    );

    let riskTrajectory = 'Stable';
    if (deltaResidual >= 2) riskTrajectory = 'Increasing';
    else if (deltaResidual <= -2) riskTrajectory = 'Decreasing';

    const threshold = Number(input.appetiteThreshold) || 12;
    const isAboveAppetite = scenarioResidualScore > threshold;

    let finalBand = 'Low';
    if (scenarioResidualScore >= 20) finalBand = 'Critical';
    else if (scenarioResidualScore >= 14) finalBand = 'High';
    else if (scenarioResidualScore >= 8) finalBand = 'Medium';

    let auditResponse = 'Monitor KRI';
    if (finalBand === 'Critical' || isAboveAppetite) {
      auditResponse = 'Immediate Assurance';
    } else if (finalBand === 'High') {
      auditResponse = 'Scope Expansion';
    } else if (finalBand === 'Low') {
      auditResponse = 'No Action';
    }

    return {
      baseResidualScore,
      scenarioResidualScore,
      deltaResidual,
      riskTrajectory,
      appetiteThreshold: threshold,
      isAboveAppetite,
      finalBand,
      auditResponse,
    };
  }

  async createOrUpdateAnalysis(
    dto: Partial<RiskScenarioAnalysis>,
  ): Promise<RiskScenarioAnalysis> {
    const metrics = this.computeRiskMetrics({
      baseImpact: dto.baseImpact || 2,
      baseLikelihood: dto.baseLikelihood || 2,
      scenarioImpact: dto.scenarioImpact || 3,
      scenarioLikelihood: dto.scenarioLikelihood || 3,
      appetiteThreshold: dto.appetiteThreshold || 12,
    });

    const analysisId =
      dto.analysisId ||
      `ANL-${dto.scenarioId}-${Date.now().toString().slice(-4)}`;

    const entity = this.analysisRepo.create({
      ...dto,
      analysisId,
      ...metrics,
    });

    return await this.analysisRepo.save(entity);
  }

  async getRiskMapData(scenarioId: string) {
    const scenario = await this.findScenario(scenarioId);
    const analyses = await this.analysisRepo.find({ where: { scenarioId } });

    const totalRisks = analyses.length;
    const aboveAppetiteCount = analyses.filter((a) => a.isAboveAppetite).length;
    const criticalCount = analyses.filter(
      (a) => a.finalBand === 'Critical',
    ).length;
    const highCount = analyses.filter((a) => a.finalBand === 'High').length;

    return {
      scenario,
      statistics: {
        totalRisks,
        aboveAppetiteCount,
        criticalCount,
        highCount,
        breachRate:
          totalRisks > 0
            ? Math.round((aboveAppetiteCount / totalRisks) * 100)
            : 0,
      },
      points: analyses.map((a) => ({
        id: a.analysisId,
        riskId: a.riskId,
        riskName: a.riskName,
        riskDomain: a.riskDomain,
        materialityExposure: a.materialityExposure,
        // Base coordinate
        baseX: a.baseLikelihood,
        baseY: a.baseImpact,
        baseScore: a.baseResidualScore,
        // Scenario coordinate
        x: a.scenarioLikelihood,
        y: a.scenarioImpact,
        score: a.scenarioResidualScore,
        delta: a.deltaResidual,
        trajectory: a.riskTrajectory,
        isAboveAppetite: a.isAboveAppetite,
        band: a.finalBand,
        response: a.auditResponse,
        impactOnPlan: a.annualPlanImpact,
      })),
    };
  }
}
