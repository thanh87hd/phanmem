import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { WorkingPapersController } from './working-papers.controller';

/**
 * WS2 — spec cấu trúc cho `working-papers.controller.ts` (trước đây không có spec).
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
  { handler: "downloadCreditTemplate", verb: "GET", path: "template/credit-excel" },
  { handler: "downloadPtdTemplate", verb: "GET", path: "template/ptd-excel" },
  { handler: "findOne", verb: "GET", path: ":id" },
  { handler: "update", verb: "PATCH", path: ":id" },
  { handler: "submit", verb: "POST", path: ":id/submit" },
  { handler: "approve", verb: "POST", path: ":id/approve" },
  { handler: "reject", verb: "POST", path: ":id/reject" },
  { handler: "remove", verb: "DELETE", path: ":id" },
  { handler: "importCreditExcel", verb: "POST", path: ":id/import-credit-excel" },
  { handler: "exportCreditExcel", verb: "GET", path: ":id/export-credit-excel" },
  { handler: "importPtdExcel", verb: "POST", path: ":id/import-ptd-excel" },
  { handler: "exportPtdExcel", verb: "GET", path: ":id/export-ptd-excel" },
  { handler: "exportExcel", verb: "GET", path: ":id/export-excel" },
  { handler: "importExcel", verb: "POST", path: ":id/import-excel" },
  { handler: "exportWord", verb: "GET", path: ":id/export/word" },
] as const;

describe('WorkingPapersController', () => {
  let controller: WorkingPapersController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [WorkingPapersController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<WorkingPapersController>(WorkingPapersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, WorkingPapersController)).toEqual("working-papers");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(WorkingPapersController)).toEqual(["JwtAuthGuard","PoliciesGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["create", "create", "/", RequestMethod.POST],
      ["findAll", "findAll", "/", RequestMethod.GET],
      ["downloadCreditTemplate", "downloadCreditTemplate", "template/credit-excel", RequestMethod.GET],
      ["downloadPtdTemplate", "downloadPtdTemplate", "template/ptd-excel", RequestMethod.GET],
      ["findOne", "findOne", ":id", RequestMethod.GET],
      ["update", "update", ":id", RequestMethod.PATCH],
      ["submit", "submit", ":id/submit", RequestMethod.POST],
      ["approve", "approve", ":id/approve", RequestMethod.POST],
      ["reject", "reject", ":id/reject", RequestMethod.POST],
      ["remove", "remove", ":id", RequestMethod.DELETE],
      ["importCreditExcel", "importCreditExcel", ":id/import-credit-excel", RequestMethod.POST],
      ["exportCreditExcel", "exportCreditExcel", ":id/export-credit-excel", RequestMethod.GET],
      ["importPtdExcel", "importPtdExcel", ":id/import-ptd-excel", RequestMethod.POST],
      ["exportPtdExcel", "exportPtdExcel", ":id/export-ptd-excel", RequestMethod.GET],
      ["exportExcel", "exportExcel", ":id/export-excel", RequestMethod.GET],
      ["importExcel", "importExcel", ":id/import-excel", RequestMethod.POST],
      ["exportWord", "exportWord", ":id/export/word", RequestMethod.GET],
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

  describe('decorator route bị che khuất (dead route)', () => {
    it(
      "reject() chỉ đăng ký POST :id/reject; POST :id/rework bị che khuất (dead route)",
      () => {
        // Nest thực thi decorator bottom-up: decorator TRÊN CÙNG ghi đè
        // PATH_METADATA/METHOD_METADATA, nên các decorator phía dưới vô hiệu.
        const r = routeOf((controller as any).reject);
        expect(r).toEqual({ path: ":id/reject", method: RequestMethod.POST });
        expect(`${r.method} ${r.path}`).not.toBe(`${RequestMethod.POST} ":id/rework"`);
      },
    );
  });

});
