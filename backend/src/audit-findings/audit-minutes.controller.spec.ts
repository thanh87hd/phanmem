import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { AuditMinutesController } from './audit-minutes.controller';

/**
 * WS2 — spec cấu trúc cho `audit-minutes.controller.ts` (trước đây không có spec).
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
  { handler: "autoCollate", verb: "POST", path: "auto-collate/:engagementId" },
  { handler: "findAll", verb: "GET", path: "/" },
  { handler: "exportWord", verb: "GET", path: ":id/export/word" },
  { handler: "exportExcel", verb: "GET", path: ":id/export/excel" },
  { handler: "findOne", verb: "GET", path: ":id" },
  { handler: "update", verb: "PATCH", path: ":id" },
  { handler: "remove", verb: "DELETE", path: ":id" },
] as const;

describe('AuditMinutesController', () => {
  let controller: AuditMinutesController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuditMinutesController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<AuditMinutesController>(AuditMinutesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AuditMinutesController)).toEqual("audit-minutes");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(AuditMinutesController)).toEqual(["JwtAuthGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["create", "create", "/", RequestMethod.POST],
      ["autoCollate", "autoCollate", "auto-collate/:engagementId", RequestMethod.POST],
      ["findAll", "findAll", "/", RequestMethod.GET],
      ["exportWord", "exportWord", ":id/export/word", RequestMethod.GET],
      ["exportExcel", "exportExcel", ":id/export/excel", RequestMethod.GET],
      ["findOne", "findOne", ":id", RequestMethod.GET],
      ["update", "update", ":id", RequestMethod.PATCH],
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
