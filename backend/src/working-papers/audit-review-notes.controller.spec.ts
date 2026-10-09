import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { AuditReviewNotesController } from './audit-review-notes.controller';

/**
 * WS2 — spec cấu trúc cho `audit-review-notes.controller.ts` (trước đây không có spec).
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
  { handler: "create", verb: "POST", path: "/" },
  { handler: "respond", verb: "POST", path: ":id/respond" },
  { handler: "close", verb: "POST", path: ":id/close" },
] as const;

describe('AuditReviewNotesController', () => {
  let controller: AuditReviewNotesController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuditReviewNotesController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<AuditReviewNotesController>(AuditReviewNotesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AuditReviewNotesController)).toEqual("working-papers/review-notes");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(AuditReviewNotesController)).toEqual(["JwtAuthGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["findAll", "findAll", "/", RequestMethod.GET],
      ["create", "create", "/", RequestMethod.POST],
      ["respond", "respond", ":id/respond", RequestMethod.POST],
      ["close", "close", ":id/close", RequestMethod.POST],
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
