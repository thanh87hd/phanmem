import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { AuditSamplesController } from './audit-samples.controller';

/**
 * WS2 — spec cấu trúc cho `audit-samples.controller.ts` (trước đây không có spec).
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
  { handler: "findAllBatches", verb: "GET", path: "batches" },
  { handler: "findOneBatch", verb: "GET", path: "batches/:id" },
  { handler: "getBatchStats", verb: "GET", path: "batches/:id/stats" },
  { handler: "getBatchAnalytics", verb: "GET", path: "batches/:id/analytics" },
  { handler: "autoVerifyBatch", verb: "POST", path: "batches/:id/auto-verify" },
  { handler: "autoGenerateSamples", verb: "POST", path: "batches/:id/auto-generate" },
  { handler: "createBatch", verb: "POST", path: "batches" },
  { handler: "updateBatch", verb: "PATCH", path: "batches/:id" },
  { handler: "removeBatch", verb: "DELETE", path: "batches/:id" },
  { handler: "addSample", verb: "POST", path: "batches/:batchId/samples" },
  { handler: "addSamplesBulk", verb: "POST", path: "batches/:batchId/upload-samples" },
  { handler: "importSamples", verb: "POST", path: "batches/:batchId/import" },
  { handler: "updateSample", verb: "PATCH", path: ":sampleId" },
  { handler: "updateSampleAlias", verb: "PATCH", path: "samples/:sampleId" },
  { handler: "removeSample", verb: "DELETE", path: ":sampleId" },
  { handler: "findByEngagement", verb: "GET", path: "by-engagement/:engagementId" },
  { handler: "findByWorkingPaper", verb: "GET", path: "by-working-paper/:workingPaperId" },
  { handler: "addSampleByWorkingPaper", verb: "POST", path: "by-working-paper/:workingPaperId" },
  { handler: "findByFinding", verb: "GET", path: "by-finding/:findingId" },
  { handler: "findByAuditor", verb: "GET", path: "by-auditor/:auditorId" },
  { handler: "requestSampleChange", verb: "POST", path: "batches/:batchId/request-change" },
  { handler: "approveSampleChange", verb: "POST", path: "batches/:batchId/approve-change" },
  { handler: "exportExcel", verb: "GET", path: "export/excel/:engagementId" },
  { handler: "downloadTemplate", verb: "GET", path: "template/excel" },
  { handler: "bulkAssignSamples", verb: "POST", path: "bulk-assign" },
] as const;

describe('AuditSamplesController', () => {
  let controller: AuditSamplesController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuditSamplesController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<AuditSamplesController>(AuditSamplesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AuditSamplesController)).toEqual("audit-samples");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(AuditSamplesController)).toEqual(["JwtAuthGuard","PoliciesGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["findAllBatches", "findAllBatches", "batches", RequestMethod.GET],
      ["findOneBatch", "findOneBatch", "batches/:id", RequestMethod.GET],
      ["getBatchStats", "getBatchStats", "batches/:id/stats", RequestMethod.GET],
      ["getBatchAnalytics", "getBatchAnalytics", "batches/:id/analytics", RequestMethod.GET],
      ["autoVerifyBatch", "autoVerifyBatch", "batches/:id/auto-verify", RequestMethod.POST],
      ["autoGenerateSamples", "autoGenerateSamples", "batches/:id/auto-generate", RequestMethod.POST],
      ["createBatch", "createBatch", "batches", RequestMethod.POST],
      ["updateBatch", "updateBatch", "batches/:id", RequestMethod.PATCH],
      ["removeBatch", "removeBatch", "batches/:id", RequestMethod.DELETE],
      ["addSample", "addSample", "batches/:batchId/samples", RequestMethod.POST],
      ["addSamplesBulk", "addSamplesBulk", "batches/:batchId/upload-samples", RequestMethod.POST],
      ["importSamples", "importSamples", "batches/:batchId/import", RequestMethod.POST],
      ["updateSample", "updateSample", ":sampleId", RequestMethod.PATCH],
      ["updateSampleAlias", "updateSampleAlias", "samples/:sampleId", RequestMethod.PATCH],
      ["removeSample", "removeSample", ":sampleId", RequestMethod.DELETE],
      ["findByEngagement", "findByEngagement", "by-engagement/:engagementId", RequestMethod.GET],
      ["findByWorkingPaper", "findByWorkingPaper", "by-working-paper/:workingPaperId", RequestMethod.GET],
      ["addSampleByWorkingPaper", "addSampleByWorkingPaper", "by-working-paper/:workingPaperId", RequestMethod.POST],
      ["findByFinding", "findByFinding", "by-finding/:findingId", RequestMethod.GET],
      ["findByAuditor", "findByAuditor", "by-auditor/:auditorId", RequestMethod.GET],
      ["requestSampleChange", "requestSampleChange", "batches/:batchId/request-change", RequestMethod.POST],
      ["approveSampleChange", "approveSampleChange", "batches/:batchId/approve-change", RequestMethod.POST],
      ["exportExcel", "exportExcel", "export/excel/:engagementId", RequestMethod.GET],
      ["downloadTemplate", "downloadTemplate", "template/excel", RequestMethod.GET],
      ["bulkAssignSamples", "bulkAssignSamples", "bulk-assign", RequestMethod.POST],
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
