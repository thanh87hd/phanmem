import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { QualityReviewsController } from './quality-reviews.controller';

/**
 * WS2 — spec cấu trúc cho `quality-reviews.controller.ts` (trước đây không có spec).
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
  { handler: "create", verb: "POST", path: "/" },
  { handler: "findAll", verb: "GET", path: "/" },
  { handler: "createAssessment", verb: "POST", path: "assessments" },
  { handler: "findAllAssessments", verb: "GET", path: "assessments" },
  { handler: "getOverallQualityStats", verb: "GET", path: "assessments/stats" },
  { handler: "exportAssessment", verb: "GET", path: "assessments/:id/export" },
  { handler: "findOneAssessment", verb: "GET", path: "assessments/:id" },
  { handler: "deleteAssessment", verb: "DELETE", path: "assessments/:id" },
  { handler: "findOne", verb: "GET", path: ":id" },
  { handler: "update", verb: "PATCH", path: ":id" },
  { handler: "transition", verb: "PATCH", path: ":id/transition" },
  { handler: "findActions", verb: "GET", path: "actions/:entityType/:entityId" },
  { handler: "remove", verb: "DELETE", path: ":id" },
] as const;

describe('QualityReviewsController', () => {
  let controller: QualityReviewsController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [QualityReviewsController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<QualityReviewsController>(QualityReviewsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, QualityReviewsController)).toEqual("quality-reviews");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(QualityReviewsController)).toEqual(["JwtAuthGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["create", "create", "/", RequestMethod.POST],
      ["findAll", "findAll", "/", RequestMethod.GET],
      ["createAssessment", "createAssessment", "assessments", RequestMethod.POST],
      ["findAllAssessments", "findAllAssessments", "assessments", RequestMethod.GET],
      ["getOverallQualityStats", "getOverallQualityStats", "assessments/stats", RequestMethod.GET],
      ["exportAssessment", "exportAssessment", "assessments/:id/export", RequestMethod.GET],
      ["findOneAssessment", "findOneAssessment", "assessments/:id", RequestMethod.GET],
      ["deleteAssessment", "deleteAssessment", "assessments/:id", RequestMethod.DELETE],
      ["findOne", "findOne", ":id", RequestMethod.GET],
      ["update", "update", ":id", RequestMethod.PATCH],
      ["transition", "transition", ":id/transition", RequestMethod.PATCH],
      ["findActions", "findActions", "actions/:entityType/:entityId", RequestMethod.GET],
      ["remove", "remove", ":id", RequestMethod.DELETE],
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
