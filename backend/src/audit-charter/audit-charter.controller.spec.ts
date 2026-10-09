import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { AuditCharterController } from './audit-charter.controller';

/**
 * WS2 — spec cấu trúc cho `audit-charter.controller.ts` (trước đây không có spec).
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
  { handler: "findAll", verb: "GET", path: "/" },
  { handler: "findCurrent", verb: "GET", path: "current" },
  { handler: "findOne", verb: "GET", path: ":id" },
  { handler: "create", verb: "POST", path: "/" },
  { handler: "update", verb: "PUT", path: ":id" },
  { handler: "submitForApproval", verb: "POST", path: ":id/submit" },
  { handler: "approve", verb: "POST", path: ":id/approve" },
  { handler: "reject", verb: "POST", path: ":id/reject" },
  { handler: "createNewVersion", verb: "POST", path: ":id/new-version" },
  { handler: "remove", verb: "DELETE", path: ":id" },
] as const;

describe('AuditCharterController', () => {
  let controller: AuditCharterController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuditCharterController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<AuditCharterController>(AuditCharterController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AuditCharterController)).toEqual("audit-charter");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(AuditCharterController)).toEqual(["JwtAuthGuard","PoliciesGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["findAll", "findAll", "/", RequestMethod.GET],
      ["findCurrent", "findCurrent", "current", RequestMethod.GET],
      ["findOne", "findOne", ":id", RequestMethod.GET],
      ["create", "create", "/", RequestMethod.POST],
      ["update", "update", ":id", RequestMethod.PUT],
      ["submitForApproval", "submitForApproval", ":id/submit", RequestMethod.POST],
      ["approve", "approve", ":id/approve", RequestMethod.POST],
      ["reject", "reject", ":id/reject", RequestMethod.POST],
      ["createNewVersion", "createNewVersion", ":id/new-version", RequestMethod.POST],
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
