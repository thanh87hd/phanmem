import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { AuditReportsController } from './audit-reports.controller';

/**
 * WS2 — spec cấu trúc cho `audit-reports.controller.ts` (trước đây không có spec).
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
  { handler: "autoGenerate", verb: "POST", path: "auto-generate" },
  { handler: "findAll", verb: "GET", path: "/" },
  { handler: "exportGlossary", verb: "GET", path: "glossary" },
  { handler: "exportWord", verb: "GET", path: ":id/export/word" },
  { handler: "exportPdf", verb: "GET", path: ":id/export/pdf" },
  { handler: "findOne", verb: "GET", path: ":id" },
  { handler: "update", verb: "PATCH", path: ":id" },
  { handler: "transition", verb: "POST", path: ":id/transition" },
  { handler: "sign", verb: "POST", path: ":id/sign" },
  { handler: "distribute", verb: "POST", path: ":id/distribute" },
  { handler: "getDistributions", verb: "GET", path: ":id/distributions" },
  { handler: "getDistributionStats", verb: "GET", path: ":id/distributions/stats" },
  { handler: "markRead", verb: "POST", path: "distributions/:distId/read" },
  { handler: "acknowledge", verb: "POST", path: "distributions/:distId/acknowledge" },
  { handler: "remove", verb: "DELETE", path: ":id" },
] as const;

describe('AuditReportsController', () => {
  let controller: AuditReportsController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuditReportsController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<AuditReportsController>(AuditReportsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AuditReportsController)).toEqual("audit-reports");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(AuditReportsController)).toEqual(["JwtAuthGuard","PoliciesGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["create", "create", "/", RequestMethod.POST],
      ["autoGenerate", "autoGenerate", "auto-generate", RequestMethod.POST],
      ["findAll", "findAll", "/", RequestMethod.GET],
      ["exportGlossary", "exportGlossary", "glossary", RequestMethod.GET],
      ["exportWord", "exportWord", ":id/export/word", RequestMethod.GET],
      ["exportPdf", "exportPdf", ":id/export/pdf", RequestMethod.GET],
      ["findOne", "findOne", ":id", RequestMethod.GET],
      ["update", "update", ":id", RequestMethod.PATCH],
      ["transition", "transition", ":id/transition", RequestMethod.POST],
      ["sign", "sign", ":id/sign", RequestMethod.POST],
      ["distribute", "distribute", ":id/distribute", RequestMethod.POST],
      ["getDistributions", "getDistributions", ":id/distributions", RequestMethod.GET],
      ["getDistributionStats", "getDistributionStats", ":id/distributions/stats", RequestMethod.GET],
      ["markRead", "markRead", "distributions/:distId/read", RequestMethod.POST],
      ["acknowledge", "acknowledge", "distributions/:distId/acknowledge", RequestMethod.POST],
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
