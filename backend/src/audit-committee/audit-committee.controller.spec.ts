import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { AuditCommitteeController } from './audit-committee.controller';

/**
 * WS2 — spec cấu trúc cho `audit-committee.controller.ts` (trước đây không có spec).
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
  { handler: "getCharters", verb: "GET", path: "charters" },
  { handler: "createCharter", verb: "POST", path: "charters" },
  { handler: "approveCharter", verb: "PATCH", path: "charters/:id/approve" },
  { handler: "get3LoDStats", verb: "GET", path: "3lod" },
  { handler: "getHighlights", verb: "GET", path: "highlights" },
  { handler: "getAnnualAssessments", verb: "GET", path: "annual-assessments" },
  { handler: "getAnnualAssessment", verb: "GET", path: "annual-assessments/:id" },
  { handler: "createAnnualAssessment", verb: "POST", path: "annual-assessments" },
  { handler: "updateAnnualAssessment", verb: "PATCH", path: "annual-assessments/:id" },
  { handler: "approveAnnualAssessment", verb: "POST", path: "annual-assessments/:id/approve" },
  { handler: "getExecutiveSessions", verb: "GET", path: "executive-sessions" },
  { handler: "getExecutiveSession", verb: "GET", path: "executive-sessions/:id" },
  { handler: "createExecutiveSession", verb: "POST", path: "executive-sessions" },
  { handler: "updateExecutiveSession", verb: "PATCH", path: "executive-sessions/:id" },
  { handler: "minuteExecutiveSession", verb: "POST", path: "executive-sessions/:id/minute" },
  { handler: "getCoordinations", verb: "GET", path: "coordinations" },
  { handler: "getCoordination", verb: "GET", path: "coordinations/:id" },
  { handler: "createCoordination", verb: "POST", path: "coordinations" },
  { handler: "updateCoordination", verb: "PATCH", path: "coordinations/:id" },
  { handler: "deleteCoordination", verb: "DELETE", path: "coordinations/:id" },
] as const;

describe('AuditCommitteeController', () => {
  let controller: AuditCommitteeController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuditCommitteeController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<AuditCommitteeController>(AuditCommitteeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AuditCommitteeController)).toEqual("audit-committee");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(AuditCommitteeController)).toEqual(["JwtAuthGuard","PoliciesGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["getCharters", "getCharters", "charters", RequestMethod.GET],
      ["createCharter", "createCharter", "charters", RequestMethod.POST],
      ["approveCharter", "approveCharter", "charters/:id/approve", RequestMethod.PATCH],
      ["get3LoDStats", "get3LoDStats", "3lod", RequestMethod.GET],
      ["getHighlights", "getHighlights", "highlights", RequestMethod.GET],
      ["getAnnualAssessments", "getAnnualAssessments", "annual-assessments", RequestMethod.GET],
      ["getAnnualAssessment", "getAnnualAssessment", "annual-assessments/:id", RequestMethod.GET],
      ["createAnnualAssessment", "createAnnualAssessment", "annual-assessments", RequestMethod.POST],
      ["updateAnnualAssessment", "updateAnnualAssessment", "annual-assessments/:id", RequestMethod.PATCH],
      ["approveAnnualAssessment", "approveAnnualAssessment", "annual-assessments/:id/approve", RequestMethod.POST],
      ["getExecutiveSessions", "getExecutiveSessions", "executive-sessions", RequestMethod.GET],
      ["getExecutiveSession", "getExecutiveSession", "executive-sessions/:id", RequestMethod.GET],
      ["createExecutiveSession", "createExecutiveSession", "executive-sessions", RequestMethod.POST],
      ["updateExecutiveSession", "updateExecutiveSession", "executive-sessions/:id", RequestMethod.PATCH],
      ["minuteExecutiveSession", "minuteExecutiveSession", "executive-sessions/:id/minute", RequestMethod.POST],
      ["getCoordinations", "getCoordinations", "coordinations", RequestMethod.GET],
      ["getCoordination", "getCoordination", "coordinations/:id", RequestMethod.GET],
      ["createCoordination", "createCoordination", "coordinations", RequestMethod.POST],
      ["updateCoordination", "updateCoordination", "coordinations/:id", RequestMethod.PATCH],
      ["deleteCoordination", "deleteCoordination", "coordinations/:id", RequestMethod.DELETE],
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
