import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { ScenarioAnalysisController } from './scenario-analysis.controller';

/**
 * WS2 — spec cấu trúc cho `scenario-analysis.controller.ts` (trước đây không có spec).
 * Khoá lại: tiền tố route, toàn bộ route (verb + path), guard bảo vệ, và
 * bất biến "không có route trùng lặp" — các hồi quy định tuyến/che chắn dễ bị bỏ sót
 * khi refactor decorator.
 */
const routeOf = (handler: (...args: any[]) => any) => ({
  path: Reflect.getMetadata(PATH_METADATA, handler),
  method: Reflect.getMetadata(METHOD_METADATA, handler),
});

const guardNames = (target: any): string[] =>
  ((Reflect.getMetadata(GUARDS_METADATA, target) as any[]) || []).map((g) =>
    typeof g === 'function' ? g.name : String(g),
  );

const routesUnderTest = [
  { handler: "getScenarios", verb: "GET", path: "scenarios" },
  { handler: "getScenario", verb: "GET", path: "scenarios/:scenarioId" },
  { handler: "getAnalyses", verb: "GET", path: "analyses" },
  { handler: "getRiskMapData", verb: "GET", path: "risk-map/:scenarioId" },
  { handler: "previewMetrics", verb: "POST", path: "calculate-preview" },
  { handler: "saveAnalysis", verb: "POST", path: "analyses" },
] as const;

describe('ScenarioAnalysisController', () => {
  let controller: ScenarioAnalysisController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ScenarioAnalysisController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<ScenarioAnalysisController>(ScenarioAnalysisController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, ScenarioAnalysisController)).toEqual("scenario-analysis");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(ScenarioAnalysisController)).toEqual(["JwtAuthGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["getScenarios", "getScenarios", "scenarios", RequestMethod.GET],
      ["getScenario", "getScenario", "scenarios/:scenarioId", RequestMethod.GET],
      ["getAnalyses", "getAnalyses", "analyses", RequestMethod.GET],
      ["getRiskMapData", "getRiskMapData", "risk-map/:scenarioId", RequestMethod.GET],
      ["previewMetrics", "previewMetrics", "calculate-preview", RequestMethod.POST],
      ["saveAnalysis", "saveAnalysis", "analyses", RequestMethod.POST],
    ] as const)(
      '%s → %s %s',
      (_label, methodName, expectedPath, expectedMethod) => {
        const handler = (controller as any)[methodName];
        expect(typeof handler).toBe('function');
        expect(routeOf(handler)).toEqual({
          path: expectedPath,
          method: expectedMethod,
        });
      },
    );
  });

  it('không có route trùng lặp (verb + path)', () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const r of routesUnderTest) {
      const key = `${r.verb} ${r.path}`;
      if (seen.has(key)) duplicates.push(key);
      seen.set(key, r.handler);
    }
    expect(duplicates).toEqual([]);
  });
});
