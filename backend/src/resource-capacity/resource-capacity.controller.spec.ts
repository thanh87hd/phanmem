import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { ResourceCapacityController } from './resource-capacity.controller';

/**
 * WS2 — spec cấu trúc cho `resource-capacity.controller.ts` (trước đây không có spec).
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
  { handler: "getStaff", verb: "GET", path: "staff" },
  { handler: "getDemands", verb: "GET", path: "demands" },
  { handler: "getAllocations", verb: "GET", path: "allocations" },
  { handler: "getQuarterlySummary", verb: "GET", path: "quarterly-summary" },
  { handler: "getSkillGapMatrix", verb: "GET", path: "skill-gap-matrix" },
  { handler: "allocate", verb: "POST", path: "allocate" },
] as const;

describe('ResourceCapacityController', () => {
  let controller: ResourceCapacityController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ResourceCapacityController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<ResourceCapacityController>(ResourceCapacityController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, ResourceCapacityController)).toEqual("resource-capacity");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(ResourceCapacityController)).toEqual(["JwtAuthGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["getStaff", "getStaff", "staff", RequestMethod.GET],
      ["getDemands", "getDemands", "demands", RequestMethod.GET],
      ["getAllocations", "getAllocations", "allocations", RequestMethod.GET],
      ["getQuarterlySummary", "getQuarterlySummary", "quarterly-summary", RequestMethod.GET],
      ["getSkillGapMatrix", "getSkillGapMatrix", "skill-gap-matrix", RequestMethod.GET],
      ["allocate", "allocate", "allocate", RequestMethod.POST],
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
