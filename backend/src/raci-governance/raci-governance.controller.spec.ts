import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RaciGovernanceController } from './raci-governance.controller';

/**
 * WS2 — spec cấu trúc cho `raci-governance.controller.ts` (trước đây không có spec).
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
  { handler: "getProcesses", verb: "GET", path: "processes" },
  { handler: "getActivities", verb: "GET", path: "processes/:processId/activities" },
  { handler: "getMatrix", verb: "GET", path: "processes/:processId/matrix" },
  { handler: "runQaChecks", verb: "GET", path: "processes/:processId/qa-checks" },
] as const;

describe('RaciGovernanceController', () => {
  let controller: RaciGovernanceController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [RaciGovernanceController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<RaciGovernanceController>(RaciGovernanceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, RaciGovernanceController)).toEqual("raci-governance");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(RaciGovernanceController)).toEqual(["JwtAuthGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["getProcesses", "getProcesses", "processes", RequestMethod.GET],
      ["getActivities", "getActivities", "processes/:processId/activities", RequestMethod.GET],
      ["getMatrix", "getMatrix", "processes/:processId/matrix", RequestMethod.GET],
      ["runQaChecks", "runQaChecks", "processes/:processId/qa-checks", RequestMethod.GET],
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
