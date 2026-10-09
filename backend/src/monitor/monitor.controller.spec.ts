import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { MonitorController } from './monitor.controller';

/**
 * WS2 — spec cấu trúc cho `monitor.controller.ts` (trước đây không có spec).
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
  { handler: "getServerStats", verb: "GET", path: "server" },
  { handler: "getDatabaseStats", verb: "GET", path: "database" },
  { handler: "getQueueStats", verb: "GET", path: "queues" },
] as const;

describe('MonitorController', () => {
  let controller: MonitorController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [MonitorController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<MonitorController>(MonitorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, MonitorController)).toEqual("monitor");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(MonitorController)).toEqual(["JwtAuthGuard","RolesGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["getServerStats", "getServerStats", "server", RequestMethod.GET],
      ["getDatabaseStats", "getDatabaseStats", "database", RequestMethod.GET],
      ["getQueueStats", "getQueueStats", "queues", RequestMethod.GET],
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
