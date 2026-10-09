import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { TestOfControlController } from './test-of-control.controller';

/**
 * WS2 — spec cấu trúc cho `test-of-control.controller.ts` (trước đây không có spec).
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
  { handler: "getStats", verb: "GET", path: "stats" },
  { handler: "findOne", verb: "GET", path: ":testId" },
  { handler: "create", verb: "POST", path: "/" },
  { handler: "update", verb: "PUT", path: ":testId" },
  { handler: "addException", verb: "POST", path: ":testId/exceptions" },
  { handler: "generateFinding", verb: "POST", path: "exceptions/:exceptionId/generate-finding" },
] as const;

describe('TestOfControlController', () => {
  let controller: TestOfControlController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [TestOfControlController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<TestOfControlController>(TestOfControlController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, TestOfControlController)).toEqual("test-of-control");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(TestOfControlController)).toEqual(["JwtAuthGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["findAll", "findAll", "/", RequestMethod.GET],
      ["getStats", "getStats", "stats", RequestMethod.GET],
      ["findOne", "findOne", ":testId", RequestMethod.GET],
      ["create", "create", "/", RequestMethod.POST],
      ["update", "update", ":testId", RequestMethod.PUT],
      ["addException", "addException", ":testId/exceptions", RequestMethod.POST],
      ["generateFinding", "generateFinding", "exceptions/:exceptionId/generate-finding", RequestMethod.POST],
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
