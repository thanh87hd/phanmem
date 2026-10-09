import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { FileAssetsController } from './file-assets.controller';

/**
 * WS2 — spec cấu trúc cho `file-assets.controller.ts` (trước đây không có spec).
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
  { handler: "upload", verb: "POST", path: "upload" },
  { handler: "createLink", verb: "POST", path: "links" },
  { handler: "findLinks", verb: "GET", path: "links" },
  { handler: "getLink", verb: "GET", path: "links/:linkId" },
  { handler: "downloadByLink", verb: "GET", path: "links/:linkId/download" },
  { handler: "downloadByAsset", verb: "GET", path: ":id/download" },
  { handler: "removeLink", verb: "DELETE", path: "links/:linkId" },
  { handler: "verifyEvidence", verb: "POST", path: "links/:linkId/verify" },
] as const;

describe('FileAssetsController', () => {
  let controller: FileAssetsController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [FileAssetsController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<FileAssetsController>(FileAssetsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, FileAssetsController)).toEqual("file-assets");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(FileAssetsController)).toEqual(["JwtAuthGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["upload", "upload", "upload", RequestMethod.POST],
      ["createLink", "createLink", "links", RequestMethod.POST],
      ["findLinks", "findLinks", "links", RequestMethod.GET],
      ["getLink", "getLink", "links/:linkId", RequestMethod.GET],
      ["downloadByLink", "downloadByLink", "links/:linkId/download", RequestMethod.GET],
      ["downloadByAsset", "downloadByAsset", ":id/download", RequestMethod.GET],
      ["removeLink", "removeLink", "links/:linkId", RequestMethod.DELETE],
      ["verifyEvidence", "verifyEvidence", "links/:linkId/verify", RequestMethod.POST],
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
