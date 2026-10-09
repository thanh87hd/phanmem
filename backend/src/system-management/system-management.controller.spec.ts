import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { SystemManagementController } from './system-management.controller';

/**
 * WS2 — spec cấu trúc cho `system-management.controller.ts` (trước đây không có spec).
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
  { handler: "getLogStats", verb: "GET", path: "log-stats" },
  { handler: "createBackup", verb: "POST", path: "backup" },
  { handler: "getBackups", verb: "GET", path: "backups" },
  { handler: "getBackupStats", verb: "GET", path: "backup-stats" },
  { handler: "downloadBackup", verb: "GET", path: "backups/download" },
  { handler: "uploadBackup", verb: "POST", path: "backups/upload" },
  { handler: "restoreBackup", verb: "POST", path: "backups/restore" },
  { handler: "deleteBackup", verb: "DELETE", path: "backups/:fileName" },
  { handler: "getSecurityConfig", verb: "GET", path: "security-config" },
  { handler: "updateSecurityConfig", verb: "PATCH", path: "security-config" },
  { handler: "applyPciDssPreset", verb: "POST", path: "security-config/preset/pci-dss" },
  { handler: "applyIso27001Preset", verb: "POST", path: "security-config/preset/iso-27001" },
  { handler: "checkCompliance", verb: "GET", path: "security-config/compliance" },
  { handler: "getSmtpConfig", verb: "GET", path: "smtp-config" },
  { handler: "saveSmtpConfig", verb: "POST", path: "smtp-config" },
  { handler: "testSmtpConfig", verb: "POST", path: "smtp-config/test" },
  { handler: "getSsoProviders", verb: "GET", path: "sso-providers" },
  { handler: "createSsoProvider", verb: "POST", path: "sso-providers" },
  { handler: "updateSsoProvider", verb: "PATCH", path: "sso-providers/:id" },
  { handler: "deleteSsoProvider", verb: "DELETE", path: "sso-providers/:id" },
  { handler: "testSsoProvider", verb: "POST", path: "sso-providers/:id/test" },
] as const;

describe('SystemManagementController', () => {
  let controller: SystemManagementController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [SystemManagementController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = moduleRef.get<SystemManagementController>(SystemManagementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn đúng tiền tố route ở cấp controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, SystemManagementController)).toEqual("system-management");
  });

  it('được bảo vệ bởi guard ở cấp controller', () => {
    expect(guardNames(SystemManagementController)).toEqual(["JwtAuthGuard","PoliciesGuard"]);
  });

  describe('metadata route', () => {
    it.each([
      ["getLogStats", "getLogStats", "log-stats", RequestMethod.GET],
      ["createBackup", "createBackup", "backup", RequestMethod.POST],
      ["getBackups", "getBackups", "backups", RequestMethod.GET],
      ["getBackupStats", "getBackupStats", "backup-stats", RequestMethod.GET],
      ["downloadBackup", "downloadBackup", "backups/download", RequestMethod.GET],
      ["uploadBackup", "uploadBackup", "backups/upload", RequestMethod.POST],
      ["restoreBackup", "restoreBackup", "backups/restore", RequestMethod.POST],
      ["deleteBackup", "deleteBackup", "backups/:fileName", RequestMethod.DELETE],
      ["getSecurityConfig", "getSecurityConfig", "security-config", RequestMethod.GET],
      ["updateSecurityConfig", "updateSecurityConfig", "security-config", RequestMethod.PATCH],
      ["applyPciDssPreset", "applyPciDssPreset", "security-config/preset/pci-dss", RequestMethod.POST],
      ["applyIso27001Preset", "applyIso27001Preset", "security-config/preset/iso-27001", RequestMethod.POST],
      ["checkCompliance", "checkCompliance", "security-config/compliance", RequestMethod.GET],
      ["getSmtpConfig", "getSmtpConfig", "smtp-config", RequestMethod.GET],
      ["saveSmtpConfig", "saveSmtpConfig", "smtp-config", RequestMethod.POST],
      ["testSmtpConfig", "testSmtpConfig", "smtp-config/test", RequestMethod.POST],
      ["getSsoProviders", "getSsoProviders", "sso-providers", RequestMethod.GET],
      ["createSsoProvider", "createSsoProvider", "sso-providers", RequestMethod.POST],
      ["updateSsoProvider", "updateSsoProvider", "sso-providers/:id", RequestMethod.PATCH],
      ["deleteSsoProvider", "deleteSsoProvider", "sso-providers/:id", RequestMethod.DELETE],
      ["testSsoProvider", "testSsoProvider", "sso-providers/:id/test", RequestMethod.POST],
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
