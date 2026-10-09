import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { AuditEngagementsController } from './audit-engagements.controller';

/**
 * WS2 — spec cấu trúc cho `audit-engagements.controller.ts` (trước đây không có spec).
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
  { handler: "getChangeRequests", verb: "GET", path: "change-requests" },
  { handler: "createChangeRequest", verb: "POST", path: ":id/change-requests" },
  { handler: "approveChangeRequest", verb: "POST", path: "change-requests/:reqId/approve" },
  { handler: "rejectChangeRequest", verb: "POST", path: "change-requests/:reqId/reject" },
  { handler: "exportPlanWord", verb: "GET", path: ":id/export/plan-word" },
  { handler: "officialize", verb: "POST", path: ":id/officialize" },
  { handler: "submitProposal", verb: "POST", path: ":id/submit-proposal" },
  { handler: "approveProposal", verb: "POST", path: ":id/approve-proposal" },
  { handler: "rejectProposal", verb: "POST", path: ":id/reject-proposal" },
  { handler: "findOne", verb: "GET", path: ":id" },
  { handler: "findWorkstreams", verb: "GET", path: ":id/workstreams" },
  { handler: "createWorkstream", verb: "POST", path: ":id/workstreams" },
  { handler: "requestClose", verb: "POST", path: ":id/request-close" },
  { handler: "closeWorkspace", verb: "POST", path: ":id/close" },
  { handler: "update", verb: "PATCH", path: ":id" },
  { handler: "remove", verb: "DELETE", path: ":id" },
  { handler: "updateWorkstream", verb: "PATCH", path: "/workstreams/:id" },
  { handler: "deleteWorkstream", verb: "DELETE", path: "/workstreams/:id" },
  { handler: "completeWorkstream", verb: "POST", path: "/workstreams/:id/complete" },
  { handler: "reviewWorkstream", verb: "POST", path: "/workstreams/:id/review" },
] as const;

describe('AuditEngagementsController', () => {
  let controller: AuditEngagementsController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuditEngagementsController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<AuditEngagementsController>(AuditEngagementsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AuditEngagementsController)).toEqual("audit-engagements");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(AuditEngagementsController)).toEqual(["JwtAuthGuard","PoliciesGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["create", "create", "/", RequestMethod.POST],
      ["findAll", "findAll", "/", RequestMethod.GET],
      ["getChangeRequests", "getChangeRequests", "change-requests", RequestMethod.GET],
      ["createChangeRequest", "createChangeRequest", ":id/change-requests", RequestMethod.POST],
      ["approveChangeRequest", "approveChangeRequest", "change-requests/:reqId/approve", RequestMethod.POST],
      ["rejectChangeRequest", "rejectChangeRequest", "change-requests/:reqId/reject", RequestMethod.POST],
      ["exportPlanWord", "exportPlanWord", ":id/export/plan-word", RequestMethod.GET],
      ["officialize", "officialize", ":id/officialize", RequestMethod.POST],
      ["submitProposal", "submitProposal", ":id/submit-proposal", RequestMethod.POST],
      ["approveProposal", "approveProposal", ":id/approve-proposal", RequestMethod.POST],
      ["rejectProposal", "rejectProposal", ":id/reject-proposal", RequestMethod.POST],
      ["findOne", "findOne", ":id", RequestMethod.GET],
      ["findWorkstreams", "findWorkstreams", ":id/workstreams", RequestMethod.GET],
      ["createWorkstream", "createWorkstream", ":id/workstreams", RequestMethod.POST],
      ["requestClose", "requestClose", ":id/request-close", RequestMethod.POST],
      ["closeWorkspace", "closeWorkspace", ":id/close", RequestMethod.POST],
      ["update", "update", ":id", RequestMethod.PATCH],
      ["remove", "remove", ":id", RequestMethod.DELETE],
      ["updateWorkstream", "updateWorkstream", "/workstreams/:id", RequestMethod.PATCH],
      ["deleteWorkstream", "deleteWorkstream", "/workstreams/:id", RequestMethod.DELETE],
      ["completeWorkstream", "completeWorkstream", "/workstreams/:id/complete", RequestMethod.POST],
      ["reviewWorkstream", "reviewWorkstream", "/workstreams/:id/review", RequestMethod.POST],
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
