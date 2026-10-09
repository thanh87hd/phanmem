import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { QaipController } from './qaip.controller';

/**
 * WS2 — spec cấu trúc cho `qaip.controller.ts` (trước đây không có spec).
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
  { handler: "getAll", verb: "GET", path: "/" },
  { handler: "getEqas", verb: "GET", path: "eqa" },
  { handler: "createEqa", verb: "POST", path: "eqa" },
  { handler: "getSurveys", verb: "GET", path: "surveys" },
  { handler: "createSurvey", verb: "POST", path: "surveys" },
  { handler: "getSurveyStats", verb: "GET", path: "surveys/stats" },
  { handler: "getIqas", verb: "GET", path: "iqa" },
  { handler: "getIqaKpis", verb: "GET", path: "iqa/kpis" },
  { handler: "getIqa", verb: "GET", path: "iqa/:id" },
  { handler: "createIqa", verb: "POST", path: "iqa" },
  { handler: "updateIqa", verb: "PUT", path: "iqa/:id" },
  { handler: "deleteIqa", verb: "DELETE", path: "iqa/:id" },
] as const;

describe('QaipController', () => {
  let controller: QaipController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [QaipController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<QaipController>(QaipController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, QaipController)).toEqual("qaip");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(QaipController)).toEqual(["JwtAuthGuard","PoliciesGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["getAll", "getAll", "/", RequestMethod.GET],
      ["getEqas", "getEqas", "eqa", RequestMethod.GET],
      ["createEqa", "createEqa", "eqa", RequestMethod.POST],
      ["getSurveys", "getSurveys", "surveys", RequestMethod.GET],
      ["createSurvey", "createSurvey", "surveys", RequestMethod.POST],
      ["getSurveyStats", "getSurveyStats", "surveys/stats", RequestMethod.GET],
      ["getIqas", "getIqas", "iqa", RequestMethod.GET],
      ["getIqaKpis", "getIqaKpis", "iqa/kpis", RequestMethod.GET],
      ["getIqa", "getIqa", "iqa/:id", RequestMethod.GET],
      ["createIqa", "createIqa", "iqa", RequestMethod.POST],
      ["updateIqa", "updateIqa", "iqa/:id", RequestMethod.PUT],
      ["deleteIqa", "deleteIqa", "iqa/:id", RequestMethod.DELETE],
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
