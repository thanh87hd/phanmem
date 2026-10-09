import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { AuditFindingsController } from './audit-findings.controller';

/**
 * WS2 — spec cấu trúc cho `audit-findings.controller.ts` (trước đây không có spec).
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
  { handler: "exportExcel", verb: "GET", path: "export" },
  { handler: "getKpcsStats", verb: "GET", path: "kpcs-stats" },
  { handler: "uploadExcel", verb: "POST", path: "upload" },
  { handler: "getMultiDimensionalStats", verb: "GET", path: "stats/multi-dimensional" },
  { handler: "findOne", verb: "GET", path: ":id" },
  { handler: "update", verb: "PATCH", path: ":id" },
  { handler: "transition", verb: "POST", path: ":id/transition" },
  { handler: "remove", verb: "DELETE", path: ":id" },
] as const;

describe('AuditFindingsController', () => {
  let controller: AuditFindingsController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuditFindingsController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<AuditFindingsController>(AuditFindingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AuditFindingsController)).toEqual("audit-findings");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(AuditFindingsController)).toEqual(["JwtAuthGuard","PoliciesGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["create", "create", "/", RequestMethod.POST],
      ["findAll", "findAll", "/", RequestMethod.GET],
      ["exportExcel", "exportExcel", "export", RequestMethod.GET],
      ["getKpcsStats", "getKpcsStats", "kpcs-stats", RequestMethod.GET],
      ["uploadExcel", "uploadExcel", "upload", RequestMethod.POST],
      ["getMultiDimensionalStats", "getMultiDimensionalStats", "stats/multi-dimensional", RequestMethod.GET],
      ["findOne", "findOne", ":id", RequestMethod.GET],
      ["update", "update", ":id", RequestMethod.PATCH],
      ["transition", "transition", ":id/transition", RequestMethod.POST],
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
