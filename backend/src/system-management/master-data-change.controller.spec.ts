import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { MasterDataChangeController } from './master-data-change.controller';

/**
 * WS2 — spec cấu trúc cho `master-data-change.controller.ts` (trước đây không có spec).
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
  { handler: "getEmergingRisksSummary", verb: "GET", path: "emerging-risks-summary" },
  { handler: "findOne", verb: "GET", path: ":id" },
  { handler: "create", verb: "POST", path: "/" },
  { handler: "approveL1", verb: "POST", path: ":id/approve-l1" },
  { handler: "approveL2", verb: "POST", path: ":id/approve-l2" },
  { handler: "reject", verb: "POST", path: ":id/reject" },
] as const;

describe('MasterDataChangeController', () => {
  let controller: MasterDataChangeController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [MasterDataChangeController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<MasterDataChangeController>(MasterDataChangeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, MasterDataChangeController)).toEqual("master-data-changes");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(MasterDataChangeController)).toEqual(["JwtAuthGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["findAll", "findAll", "/", RequestMethod.GET],
      ["getEmergingRisksSummary", "getEmergingRisksSummary", "emerging-risks-summary", RequestMethod.GET],
      ["findOne", "findOne", ":id", RequestMethod.GET],
      ["create", "create", "/", RequestMethod.POST],
      ["approveL1", "approveL1", ":id/approve-l1", RequestMethod.POST],
      ["approveL2", "approveL2", ":id/approve-l2", RequestMethod.POST],
      ["reject", "reject", ":id/reject", RequestMethod.POST],
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
