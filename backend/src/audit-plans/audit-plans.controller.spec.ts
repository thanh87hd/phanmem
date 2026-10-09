import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { AuditPlansController } from './audit-plans.controller';

/**
 * WS2 — spec cấu trúc cho `audit-plans.controller.ts` (trước đây không có spec).
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
  { handler: "getRiskCoverage", verb: "GET", path: "risk-coverage" },
  { handler: "getUniverseWithRisk", verb: "GET", path: "universe-with-risk" },
  { handler: "findOne", verb: "GET", path: ":id" },
  { handler: "update", verb: "PATCH", path: ":id" },
  { handler: "remove", verb: "DELETE", path: ":id" },
  { handler: "submit", verb: "POST", path: ":id/submit" },
  { handler: "approveL1", verb: "POST", path: ":id/approve-l1" },
  { handler: "approveL2", verb: "POST", path: ":id/approve-l2" },
  { handler: "approve", verb: "POST", path: ":id/approve" },
  { handler: "reject", verb: "POST", path: ":id/reject" },
  { handler: "submitRevision", verb: "POST", path: ":id/revisions" },
  { handler: "decompose", verb: "POST", path: ":id/decompose" },
] as const;

describe('AuditPlansController', () => {
  let controller: AuditPlansController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuditPlansController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<AuditPlansController>(AuditPlansController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AuditPlansController)).toEqual("audit-plans");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(AuditPlansController)).toEqual(["JwtAuthGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["create", "create", "/", RequestMethod.POST],
      ["findAll", "findAll", "/", RequestMethod.GET],
      ["getRiskCoverage", "getRiskCoverage", "risk-coverage", RequestMethod.GET],
      ["getUniverseWithRisk", "getUniverseWithRisk", "universe-with-risk", RequestMethod.GET],
      ["findOne", "findOne", ":id", RequestMethod.GET],
      ["update", "update", ":id", RequestMethod.PATCH],
      ["remove", "remove", ":id", RequestMethod.DELETE],
      ["submit", "submit", ":id/submit", RequestMethod.POST],
      ["approveL1", "approveL1", ":id/approve-l1", RequestMethod.POST],
      ["approveL2", "approveL2", ":id/approve-l2", RequestMethod.POST],
      ["approve", "approve", ":id/approve", RequestMethod.POST],
      ["reject", "reject", ":id/reject", RequestMethod.POST],
      ["submitRevision", "submitRevision", ":id/revisions", RequestMethod.POST],
      ["decompose", "decompose", ":id/decompose", RequestMethod.POST],
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
