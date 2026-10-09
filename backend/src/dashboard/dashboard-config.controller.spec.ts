import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { DashboardConfigController } from './dashboard-config.controller';

/**
 * WS2 — spec cấu trúc cho `dashboard-config.controller.ts` (trước đây không có spec).
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
  { handler: "getConfig", verb: "GET", path: ":dashboardKey" },
  { handler: "saveConfig", verb: "PUT", path: ":dashboardKey" },
  { handler: "resetConfig", verb: "POST", path: ":dashboardKey/reset" },
  { handler: "getDefaults", verb: "GET", path: ":dashboardKey/defaults" },
] as const;

describe('DashboardConfigController', () => {
  let controller: DashboardConfigController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [DashboardConfigController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<DashboardConfigController>(DashboardConfigController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, DashboardConfigController)).toEqual("dashboard/config");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(DashboardConfigController)).toEqual(["JwtAuthGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["getConfig", "getConfig", ":dashboardKey", RequestMethod.GET],
      ["saveConfig", "saveConfig", ":dashboardKey", RequestMethod.PUT],
      ["resetConfig", "resetConfig", ":dashboardKey/reset", RequestMethod.POST],
      ["getDefaults", "getDefaults", ":dashboardKey/defaults", RequestMethod.GET],
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
