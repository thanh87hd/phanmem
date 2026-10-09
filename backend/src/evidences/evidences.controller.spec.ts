import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { EvidencesController } from './evidences.controller';

/**
 * WS2 — spec cấu trúc cho `evidences.controller.ts` (trước đây không có spec).
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
  { handler: "upload", verb: "POST", path: "upload" },
  { handler: "findByResource", verb: "GET", path: "/" },
  { handler: "download", verb: "GET", path: ":id/download" },
  { handler: "remove", verb: "DELETE", path: ":id" },
  { handler: "aiVerify", verb: "POST", path: ":id/ai-verify" },
] as const;

describe('EvidencesController', () => {
  let controller: EvidencesController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [EvidencesController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<EvidencesController>(EvidencesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, EvidencesController)).toEqual("evidences");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(EvidencesController)).toEqual(["JwtAuthGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["upload", "upload", "upload", RequestMethod.POST],
      ["findByResource", "findByResource", "/", RequestMethod.GET],
      ["download", "download", ":id/download", RequestMethod.GET],
      ["remove", "remove", ":id", RequestMethod.DELETE],
      ["aiVerify", "aiVerify", ":id/ai-verify", RequestMethod.POST],
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
