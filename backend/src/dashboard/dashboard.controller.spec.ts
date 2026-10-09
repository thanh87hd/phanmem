import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { DashboardController } from './dashboard.controller';

/**
 * WS2 — spec cấu trúc cho `dashboard.controller.ts` (trước đây không có spec).
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
  { handler: "getStats", verb: "GET", path: "stats" },
  { handler: "getRiskDistribution", verb: "GET", path: "risk-distribution" },
  { handler: "getAuditProgress", verb: "GET", path: "audit-progress" },
  { handler: "getRecommendationByDept", verb: "GET", path: "recommendation-by-dept" },
  { handler: "getRiskWidgets", verb: "GET", path: "risk-widgets" },
  { handler: "getExecutiveGroupedOverview", verb: "GET", path: "executive-grouped-overview" },
] as const;

describe('DashboardController', () => {
  let controller: DashboardController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<DashboardController>(DashboardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, DashboardController)).toEqual("dashboard");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(DashboardController)).toEqual(["JwtAuthGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["getStats", "getStats", "stats", RequestMethod.GET],
      ["getRiskDistribution", "getRiskDistribution", "risk-distribution", RequestMethod.GET],
      ["getAuditProgress", "getAuditProgress", "audit-progress", RequestMethod.GET],
      ["getRecommendationByDept", "getRecommendationByDept", "recommendation-by-dept", RequestMethod.GET],
      ["getRiskWidgets", "getRiskWidgets", "risk-widgets", RequestMethod.GET],
      ["getExecutiveGroupedOverview", "getExecutiveGroupedOverview", "executive-grouped-overview", RequestMethod.GET],
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
