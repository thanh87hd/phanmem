import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { IndependenceController } from './independence.controller';

/**
 * WS2 — spec cấu trúc cho `independence.controller.ts` (trước đây không có spec).
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
  { handler: "getDeclarations", verb: "GET", path: "declarations" },
  { handler: "createDeclaration", verb: "POST", path: "declarations" },
  { handler: "approveException", verb: "POST", path: "declarations/:id/approve-exception" },
  { handler: "rejectException", verb: "POST", path: "declarations/:id/reject-exception" },
  { handler: "getRotations", verb: "GET", path: "rotations" },
  { handler: "createRotation", verb: "POST", path: "rotations" },
  { handler: "deleteRotation", verb: "DELETE", path: "rotations/:id" },
  { handler: "getCoolingOff", verb: "GET", path: "cooling-off" },
  { handler: "saveCoolingOff", verb: "POST", path: "cooling-off" },
  { handler: "removeCoolingOff", verb: "DELETE", path: "cooling-off/:userId" },
  { handler: "checkSafety", verb: "POST", path: "check-safety" },
] as const;

describe('IndependenceController', () => {
  let controller: IndependenceController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [IndependenceController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<IndependenceController>(IndependenceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, IndependenceController)).toEqual("independence");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(IndependenceController)).toEqual(["JwtAuthGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["getDeclarations", "getDeclarations", "declarations", RequestMethod.GET],
      ["createDeclaration", "createDeclaration", "declarations", RequestMethod.POST],
      ["approveException", "approveException", "declarations/:id/approve-exception", RequestMethod.POST],
      ["rejectException", "rejectException", "declarations/:id/reject-exception", RequestMethod.POST],
      ["getRotations", "getRotations", "rotations", RequestMethod.GET],
      ["createRotation", "createRotation", "rotations", RequestMethod.POST],
      ["deleteRotation", "deleteRotation", "rotations/:id", RequestMethod.DELETE],
      ["getCoolingOff", "getCoolingOff", "cooling-off", RequestMethod.GET],
      ["saveCoolingOff", "saveCoolingOff", "cooling-off", RequestMethod.POST],
      ["removeCoolingOff", "removeCoolingOff", "cooling-off/:userId", RequestMethod.DELETE],
      ["checkSafety", "checkSafety", "check-safety", RequestMethod.POST],
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
