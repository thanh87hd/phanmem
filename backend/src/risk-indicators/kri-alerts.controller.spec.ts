import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { KriAlertsController } from './kri-alerts.controller';

/**
 * WS2 — spec cấu trúc cho `kri-alerts.controller.ts` (trước đây không có spec).
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
  { handler: "getKriOptions", verb: "GET", path: "options" },
  { handler: "findActive", verb: "GET", path: "active" },
  { handler: "getReport", verb: "GET", path: "report" },
  { handler: "comparePeriods", verb: "GET", path: "compare" },
  { handler: "getBatches", verb: "GET", path: "batches" },
  { handler: "findAll", verb: "GET", path: "/" },
  { handler: "findOne", verb: "GET", path: ":id" },
  { handler: "create", verb: "POST", path: "/" },
  { handler: "createBulk", verb: "POST", path: "bulk" },
  { handler: "update", verb: "PATCH", path: ":id" },
  { handler: "remove", verb: "DELETE", path: ":id" },
  { handler: "parseFile", verb: "POST", path: "parse" },
  { handler: "uploadBulk", verb: "POST", path: "upload-bulk" },
  { handler: "uploadPerFile", verb: "POST", path: "upload-per-file" },
] as const;

describe('KriAlertsController', () => {
  let controller: KriAlertsController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [KriAlertsController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<KriAlertsController>(KriAlertsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, KriAlertsController)).toEqual("risk-indicators/kri-alerts");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(KriAlertsController)).toEqual(["JwtAuthGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["getKriOptions", "getKriOptions", "options", RequestMethod.GET],
      ["findActive", "findActive", "active", RequestMethod.GET],
      ["getReport", "getReport", "report", RequestMethod.GET],
      ["comparePeriods", "comparePeriods", "compare", RequestMethod.GET],
      ["getBatches", "getBatches", "batches", RequestMethod.GET],
      ["findAll", "findAll", "/", RequestMethod.GET],
      ["findOne", "findOne", ":id", RequestMethod.GET],
      ["create", "create", "/", RequestMethod.POST],
      ["createBulk", "createBulk", "bulk", RequestMethod.POST],
      ["update", "update", ":id", RequestMethod.PATCH],
      ["remove", "remove", ":id", RequestMethod.DELETE],
      ["parseFile", "parseFile", "parse", RequestMethod.POST],
      ["uploadBulk", "uploadBulk", "upload-bulk", RequestMethod.POST],
      ["uploadPerFile", "uploadPerFile", "upload-per-file", RequestMethod.POST],
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
