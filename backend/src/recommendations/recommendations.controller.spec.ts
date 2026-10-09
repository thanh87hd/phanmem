import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RecommendationsController } from './recommendations.controller';

/**
 * WS2 — spec cấu trúc cho `recommendations.controller.ts` (trước đây không có spec).
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
  { handler: "create", verb: "POST", path: "/" },
  { handler: "findAll", verb: "GET", path: "/" },
  { handler: "getStats", verb: "GET", path: "stats" },
  { handler: "exportFull", verb: "GET", path: "export-full" },
  { handler: "checkOverdue", verb: "POST", path: "check-overdue" },
  { handler: "findByDepartment", verb: "GET", path: "by-department" },
  { handler: "findOne", verb: "GET", path: ":id" },
  { handler: "submitPlan", verb: "POST", path: ":id/submit-plan" },
  { handler: "updateProgress", verb: "POST", path: ":id/progress" },
  { handler: "requestClosure", verb: "POST", path: ":id/request-closure" },
  { handler: "ktnbReview", verb: "POST", path: ":id/ktnb-review" },
  { handler: "teamLeadOpinion", verb: "POST", path: ":id/team-lead-opinion" },
  { handler: "close", verb: "POST", path: ":id/close" },
  { handler: "verify", verb: "POST", path: ":id/verify" },
  { handler: "setSelfMonitor", verb: "PATCH", path: ":id/self-monitor" },
  { handler: "update", verb: "PATCH", path: ":id" },
  { handler: "requestRiskAcceptance", verb: "POST", path: ":id/risk-acceptance/request" },
  { handler: "reviewRiskAcceptanceByCAE", verb: "POST", path: ":id/risk-acceptance/cae-review" },
  { handler: "approveRiskAcceptance", verb: "POST", path: ":id/risk-acceptance/approve" },
  { handler: "rejectRiskAcceptance", verb: "POST", path: ":id/risk-acceptance/reject" },
  { handler: "remove", verb: "DELETE", path: ":id" },
] as const;

describe('RecommendationsController', () => {
  let controller: RecommendationsController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationsController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<RecommendationsController>(RecommendationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, RecommendationsController)).toEqual("recommendations");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(RecommendationsController)).toEqual(["JwtAuthGuard","PoliciesGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["create", "create", "/", RequestMethod.POST],
      ["findAll", "findAll", "/", RequestMethod.GET],
      ["getStats", "getStats", "stats", RequestMethod.GET],
      ["exportFull", "exportFull", "export-full", RequestMethod.GET],
      ["checkOverdue", "checkOverdue", "check-overdue", RequestMethod.POST],
      ["findByDepartment", "findByDepartment", "by-department", RequestMethod.GET],
      ["findOne", "findOne", ":id", RequestMethod.GET],
      ["submitPlan", "submitPlan", ":id/submit-plan", RequestMethod.POST],
      ["updateProgress", "updateProgress", ":id/progress", RequestMethod.POST],
      ["requestClosure", "requestClosure", ":id/request-closure", RequestMethod.POST],
      ["ktnbReview", "ktnbReview", ":id/ktnb-review", RequestMethod.POST],
      ["teamLeadOpinion", "teamLeadOpinion", ":id/team-lead-opinion", RequestMethod.POST],
      ["close", "close", ":id/close", RequestMethod.POST],
      ["verify", "verify", ":id/verify", RequestMethod.POST],
      ["setSelfMonitor", "setSelfMonitor", ":id/self-monitor", RequestMethod.PATCH],
      ["update", "update", ":id", RequestMethod.PATCH],
      ["requestRiskAcceptance", "requestRiskAcceptance", ":id/risk-acceptance/request", RequestMethod.POST],
      ["reviewRiskAcceptanceByCAE", "reviewRiskAcceptanceByCAE", ":id/risk-acceptance/cae-review", RequestMethod.POST],
      ["approveRiskAcceptance", "approveRiskAcceptance", ":id/risk-acceptance/approve", RequestMethod.POST],
      ["rejectRiskAcceptance", "rejectRiskAcceptance", ":id/risk-acceptance/reject", RequestMethod.POST],
      ["remove", "remove", ":id", RequestMethod.DELETE],
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
