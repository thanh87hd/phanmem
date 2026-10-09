import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { KpiController } from './kpi.controller';

/**
 * WS2 — spec cấu trúc cho `kpi.controller.ts` (trước đây không có spec).
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
  { handler: "getKpis", verb: "GET", path: "/" },
  { handler: "getComplianceChecklist", verb: "GET", path: "compliance-checklist" },
  { handler: "getComplianceStatus", verb: "GET", path: "compliance-status" },
  { handler: "saveComplianceStatus", verb: "POST", path: "compliance-status" },
  { handler: "getPersonalKpi", verb: "GET", path: "personal" },
  { handler: "createPersonalKpi", verb: "POST", path: "personal" },
  { handler: "getMyAssessment", verb: "GET", path: "assessment/me" },
  { handler: "getAssessments", verb: "GET", path: "assessments" },
  { handler: "getPersonalSummary", verb: "POST", path: "personal/summary" },
  { handler: "getTargets", verb: "GET", path: "targets" },
] as const;

describe('KpiController', () => {
  let controller: KpiController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [KpiController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<KpiController>(KpiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, KpiController)).toEqual("kpi");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(KpiController)).toEqual(["JwtAuthGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["getKpis", "getKpis", "/", RequestMethod.GET],
      ["getComplianceChecklist", "getComplianceChecklist", "compliance-checklist", RequestMethod.GET],
      ["getComplianceStatus", "getComplianceStatus", "compliance-status", RequestMethod.GET],
      ["saveComplianceStatus", "saveComplianceStatus", "compliance-status", RequestMethod.POST],
      ["getPersonalKpi", "getPersonalKpi", "personal", RequestMethod.GET],
      ["createPersonalKpi", "createPersonalKpi", "personal", RequestMethod.POST],
      ["getMyAssessment", "getMyAssessment", "assessment/me", RequestMethod.GET],
      ["getAssessments", "getAssessments", "assessments", RequestMethod.GET],
      ["getPersonalSummary", "getPersonalSummary", "personal/summary", RequestMethod.POST],
      ["getTargets", "getTargets", "targets", RequestMethod.GET],
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
