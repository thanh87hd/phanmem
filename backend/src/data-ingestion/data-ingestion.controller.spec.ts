import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { DataIngestionController } from './data-ingestion.controller';

/**
 * WS2 — spec cấu trúc cho `data-ingestion.controller.ts` (trước đây không có spec).
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
  { handler: "getAllBatches", verb: "GET", path: "batches" },
  { handler: "getBatchById", verb: "GET", path: "batches/:id" },
  { handler: "pushData", verb: "POST", path: "push" },
  { handler: "triggerScan", verb: "POST", path: "trigger-scan" },
  { handler: "reprocessBatch", verb: "POST", path: "batches/:id/reprocess" },
  { handler: "downloadTemplate", verb: "GET", path: "templates/:type" },
] as const;

describe('DataIngestionController', () => {
  let controller: DataIngestionController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [DataIngestionController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<DataIngestionController>(DataIngestionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, DataIngestionController)).toEqual("data-ingestion");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(DataIngestionController)).toEqual(["JwtAuthGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["getAllBatches", "getAllBatches", "batches", RequestMethod.GET],
      ["getBatchById", "getBatchById", "batches/:id", RequestMethod.GET],
      ["pushData", "pushData", "push", RequestMethod.POST],
      ["triggerScan", "triggerScan", "trigger-scan", RequestMethod.POST],
      ["reprocessBatch", "reprocessBatch", "batches/:id/reprocess", RequestMethod.POST],
      ["downloadTemplate", "downloadTemplate", "templates/:type", RequestMethod.GET],
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
