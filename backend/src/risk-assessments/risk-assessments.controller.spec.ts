import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RiskAssessmentsController } from './risk-assessments.controller';

/**
 * WS2 — spec cấu trúc cho `risk-assessments.controller.ts` (trước đây không có spec).
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
  { handler: "calculateUnifiedScore", verb: "POST", path: "calculate-unified-score" },
  { handler: "getProfilesSummary", verb: "GET", path: "profiles/summary" },
  { handler: "exportRiskProfilesExcel", verb: "GET", path: "profiles/export-excel" },
  { handler: "downloadRiskProfilesTemplate", verb: "GET", path: "profiles/template-excel" },
  { handler: "importRiskProfilesExcel", verb: "POST", path: "profiles/import-excel" },
  { handler: "createChangeRequest", verb: "POST", path: "profiles/change-request" },
  { handler: "findAllChangeRequests", verb: "GET", path: "profiles/change-requests" },
  { handler: "reviewChangeRequestL1", verb: "PATCH", path: "profiles/change-requests/:id/review-l1" },
  { handler: "approveChangeRequestL2", verb: "PATCH", path: "profiles/change-requests/:id/approve-l2" },
  { handler: "getRiskProfileHistories", verb: "GET", path: "profiles/:id/histories" },
  { handler: "findAllProfiles", verb: "GET", path: "profiles" },
  { handler: "create", verb: "POST", path: "/" },
  { handler: "findAll", verb: "GET", path: "/" },
  { handler: "getRiskDefectHeatmap", verb: "GET", path: "risk-defect-heatmap" },
  { handler: "getSummaryStats", verb: "GET", path: "summary" },
  { handler: "getComparison", verb: "GET", path: "compare" },
  { handler: "getHistory", verb: "GET", path: "history/:auditUniverseId" },
  { handler: "getGroupedAssessments", verb: "GET", path: "grouped" },
  { handler: "getGroupSummary", verb: "GET", path: "group-summary/:category" },
  { handler: "getAuditFrequencyRecommendation", verb: "GET", path: "audit-frequency-recommendation" },
  { handler: "findAllRcsa", verb: "GET", path: "rcsa" },
  { handler: "findRcsaByDept", verb: "GET", path: "rcsa/dept/:deptName" },
  { handler: "createRcsa", verb: "POST", path: "rcsa" },
  { handler: "getKriOptions", verb: "GET", path: "kri/options" },
  { handler: "findAllKri", verb: "GET", path: "kri" },
  { handler: "kriWebhook", verb: "POST", path: "kri/webhook" },
  { handler: "kriBulk", verb: "POST", path: "kri/bulk" },
  { handler: "kriParse", verb: "POST", path: "kri/parse" },
  { handler: "kriUploadBulk", verb: "POST", path: "kri/upload-bulk" },
  { handler: "kriUploadPerFile", verb: "POST", path: "kri/upload-per-file" },
  { handler: "kriReport", verb: "GET", path: "kri/report" },
  { handler: "kriCompare", verb: "GET", path: "kri/compare" },
  { handler: "kriBatches", verb: "GET", path: "kri/batches" },
  { handler: "getDynamicRerating", verb: "GET", path: "dynamic-rerating" },
  { handler: "submitForReview", verb: "PATCH", path: ":id/submit" },
  { handler: "approveL1", verb: "POST", path: ":id/approve-l1" },
  { handler: "approveL2", verb: "POST", path: ":id/approve-l2" },
  { handler: "approveAssessment", verb: "PATCH", path: ":id/approve" },
  { handler: "rejectAssessment", verb: "PATCH", path: ":id/reject" },
  { handler: "findOne", verb: "GET", path: ":id" },
  { handler: "update", verb: "PATCH", path: ":id" },
  { handler: "remove", verb: "DELETE", path: ":id" },
] as const;

describe('RiskAssessmentsController', () => {
  let controller: RiskAssessmentsController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [RiskAssessmentsController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<RiskAssessmentsController>(RiskAssessmentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, RiskAssessmentsController)).toEqual("risk-assessments");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(RiskAssessmentsController)).toEqual(["JwtAuthGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["calculateUnifiedScore", "calculateUnifiedScore", "calculate-unified-score", RequestMethod.POST],
      ["getProfilesSummary", "getProfilesSummary", "profiles/summary", RequestMethod.GET],
      ["exportRiskProfilesExcel", "exportRiskProfilesExcel", "profiles/export-excel", RequestMethod.GET],
      ["downloadRiskProfilesTemplate", "downloadRiskProfilesTemplate", "profiles/template-excel", RequestMethod.GET],
      ["importRiskProfilesExcel", "importRiskProfilesExcel", "profiles/import-excel", RequestMethod.POST],
      ["createChangeRequest", "createChangeRequest", "profiles/change-request", RequestMethod.POST],
      ["findAllChangeRequests", "findAllChangeRequests", "profiles/change-requests", RequestMethod.GET],
      ["reviewChangeRequestL1", "reviewChangeRequestL1", "profiles/change-requests/:id/review-l1", RequestMethod.PATCH],
      ["approveChangeRequestL2", "approveChangeRequestL2", "profiles/change-requests/:id/approve-l2", RequestMethod.PATCH],
      ["getRiskProfileHistories", "getRiskProfileHistories", "profiles/:id/histories", RequestMethod.GET],
      ["findAllProfiles", "findAllProfiles", "profiles", RequestMethod.GET],
      ["create", "create", "/", RequestMethod.POST],
      ["findAll", "findAll", "/", RequestMethod.GET],
      ["getRiskDefectHeatmap", "getRiskDefectHeatmap", "risk-defect-heatmap", RequestMethod.GET],
      ["getSummaryStats", "getSummaryStats", "summary", RequestMethod.GET],
      ["getComparison", "getComparison", "compare", RequestMethod.GET],
      ["getHistory", "getHistory", "history/:auditUniverseId", RequestMethod.GET],
      ["getGroupedAssessments", "getGroupedAssessments", "grouped", RequestMethod.GET],
      ["getGroupSummary", "getGroupSummary", "group-summary/:category", RequestMethod.GET],
      ["getAuditFrequencyRecommendation", "getAuditFrequencyRecommendation", "audit-frequency-recommendation", RequestMethod.GET],
      ["findAllRcsa", "findAllRcsa", "rcsa", RequestMethod.GET],
      ["findRcsaByDept", "findRcsaByDept", "rcsa/dept/:deptName", RequestMethod.GET],
      ["createRcsa", "createRcsa", "rcsa", RequestMethod.POST],
      ["getKriOptions", "getKriOptions", "kri/options", RequestMethod.GET],
      ["findAllKri", "findAllKri", "kri", RequestMethod.GET],
      ["kriWebhook", "kriWebhook", "kri/webhook", RequestMethod.POST],
      ["kriBulk", "kriBulk", "kri/bulk", RequestMethod.POST],
      ["kriParse", "kriParse", "kri/parse", RequestMethod.POST],
      ["kriUploadBulk", "kriUploadBulk", "kri/upload-bulk", RequestMethod.POST],
      ["kriUploadPerFile", "kriUploadPerFile", "kri/upload-per-file", RequestMethod.POST],
      ["kriReport", "kriReport", "kri/report", RequestMethod.GET],
      ["kriCompare", "kriCompare", "kri/compare", RequestMethod.GET],
      ["kriBatches", "kriBatches", "kri/batches", RequestMethod.GET],
      ["getDynamicRerating", "getDynamicRerating", "dynamic-rerating", RequestMethod.GET],
      ["submitForReview", "submitForReview", ":id/submit", RequestMethod.PATCH],
      ["approveL1", "approveL1", ":id/approve-l1", RequestMethod.POST],
      ["approveL2", "approveL2", ":id/approve-l2", RequestMethod.POST],
      ["approveAssessment", "approveAssessment", ":id/approve", RequestMethod.PATCH],
      ["rejectAssessment", "rejectAssessment", ":id/reject", RequestMethod.PATCH],
      ["findOne", "findOne", ":id", RequestMethod.GET],
      ["update", "update", ":id", RequestMethod.PATCH],
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
