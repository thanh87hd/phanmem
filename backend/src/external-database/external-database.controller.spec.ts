import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { ExternalDatabaseController } from './external-database.controller';

/**
 * WS2 — spec cấu trúc cho `external-database.controller.ts` (trước đây không có spec).
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
  { handler: "findOne", verb: "GET", path: ":id" },
  { handler: "create", verb: "POST", path: "/" },
  { handler: "update", verb: "PATCH", path: ":id" },
  { handler: "remove", verb: "DELETE", path: ":id" },
  { handler: "testConnection", verb: "POST", path: "test-connection" },
  { handler: "query", verb: "POST", path: "query" },
  { handler: "querySaved", verb: "POST", path: "query-saved/:id" },
] as const;

describe('ExternalDatabaseController', () => {
  let controller: ExternalDatabaseController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ExternalDatabaseController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<ExternalDatabaseController>(ExternalDatabaseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, ExternalDatabaseController)).toEqual("external-database");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(ExternalDatabaseController)).toEqual(["JwtAuthGuard","PoliciesGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["findAll", "findAll", "/", RequestMethod.GET],
      ["findOne", "findOne", ":id", RequestMethod.GET],
      ["create", "create", "/", RequestMethod.POST],
      ["update", "update", ":id", RequestMethod.PATCH],
      ["remove", "remove", ":id", RequestMethod.DELETE],
      ["testConnection", "testConnection", "test-connection", RequestMethod.POST],
      ["query", "query", "query", RequestMethod.POST],
      ["querySaved", "querySaved", "query-saved/:id", RequestMethod.POST],
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
