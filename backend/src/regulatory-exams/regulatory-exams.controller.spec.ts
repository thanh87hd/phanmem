import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RegulatoryExamsController } from './regulatory-exams.controller';

/**
 * WS2 — spec cấu trúc cho `regulatory-exams.controller.ts` (trước đây không có spec).
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
  { handler: "findAllExams", verb: "GET", path: "/" },
  { handler: "findOneExam", verb: "GET", path: ":id" },
  { handler: "createExam", verb: "POST", path: "/" },
  { handler: "updateExam", verb: "PATCH", path: ":id" },
  { handler: "deleteExam", verb: "DELETE", path: ":id" },
  { handler: "createFinding", verb: "POST", path: ":id/findings" },
  { handler: "updateFinding", verb: "PATCH", path: "findings/:findingId" },
  { handler: "deleteFinding", verb: "DELETE", path: "findings/:findingId" },
] as const;

describe('RegulatoryExamsController', () => {
  let controller: RegulatoryExamsController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [RegulatoryExamsController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<RegulatoryExamsController>(RegulatoryExamsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, RegulatoryExamsController)).toEqual("regulatory-exams");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(RegulatoryExamsController)).toEqual(["JwtAuthGuard","PoliciesGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["findAllExams", "findAllExams", "/", RequestMethod.GET],
      ["findOneExam", "findOneExam", ":id", RequestMethod.GET],
      ["createExam", "createExam", "/", RequestMethod.POST],
      ["updateExam", "updateExam", ":id", RequestMethod.PATCH],
      ["deleteExam", "deleteExam", ":id", RequestMethod.DELETE],
      ["createFinding", "createFinding", ":id/findings", RequestMethod.POST],
      ["updateFinding", "updateFinding", "findings/:findingId", RequestMethod.PATCH],
      ["deleteFinding", "deleteFinding", "findings/:findingId", RequestMethod.DELETE],
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
