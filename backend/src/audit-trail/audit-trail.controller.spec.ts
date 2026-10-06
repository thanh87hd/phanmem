import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  RequestMethod,
  UnauthorizedException,
} from '@nestjs/common';
import { AuditTrailController } from './audit-trail.controller';
import { AuditTrailService } from './audit-trail.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CHECK_POLICIES_KEY } from '../casl/check-policies.decorator';
import { Action, CaslAbilityFactory } from '../casl/casl-ability.factory';

/**
 * AuditTrailController — HTTP contract of the system audit-log lookup endpoints
 * (UAT TC-SYS-05). These tests pin the exact arguments handed to AuditTrailService
 * (query validation / defaults), the authorisation metadata actually attached, và
 * các bản vá bảo mật: chống IDOR ở `/my-actions`, chặn tham số số không hợp lệ.
 *
 * NOTE on route order: `@Get('security-alerts')`, `@Get('my-actions')` và
 * `@Get(':id/verify')` được khai báo SAU `@Get()`. Nest ưu tiên path tĩnh và path
 * nhiều đoạn nên không xung đột; thứ tự được ghi chú tại đây thay vì assert.
 */
describe('AuditTrailController', () => {
  let controller: AuditTrailController;
  let auditTrailService: {
    findAll: jest.Mock;
    findAllAlerts: jest.Mock;
    findByUser: jest.Mock;
    cleanupLogs: jest.Mock;
    verifyIntegrity: jest.Mock;
  };
  let caslAbilityFactory: { createForUser: jest.Mock };

  const authedReq = (overrides: Record<string, any> = {}) => ({
    user: { userId: 9, username: 'auditor1', role: 'Auditor' },
    ip: '10.1.2.3',
    headers: { 'user-agent': 'jest-agent' },
    ...overrides,
  });

  beforeEach(async () => {
    auditTrailService = {
      findAll: jest.fn().mockResolvedValue([]),
      findAllAlerts: jest.fn().mockResolvedValue([]),
      findByUser: jest.fn().mockResolvedValue([]),
      cleanupLogs: jest
        .fn()
        .mockResolvedValue({ deleted: 0, cutoffDate: new Date(0) }),
      verifyIntegrity: jest.fn().mockResolvedValue({ valid: true }),
    };
    caslAbilityFactory = {
      // Mặc định: người dùng thường, KHÔNG có quyền quản trị AuditTrail.
      createForUser: jest.fn().mockReturnValue({ can: () => false }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditTrailController],
      providers: [
        { provide: AuditTrailService, useValue: auditTrailService },
        { provide: CaslAbilityFactory, useValue: caslAbilityFactory },
      ],
    })
      // The class-level guards are real (their metadata is asserted below); they are
      // overridden only so the testing module does not need the CASL/JWT module graph.
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PoliciesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuditTrailController>(AuditTrailController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('is mounted at the audit-trail route', () => {
    expect(Reflect.getMetadata('path', AuditTrailController)).toBe(
      'audit-trail',
    );
  });

  describe('findAll (GET /api/audit-trail)', () => {
    it('forwards the resource filter and coerces the limit query string to a number', async () => {
      await controller.findAll('AuditFinding', '50');

      expect(auditTrailService.findAll).toHaveBeenCalledTimes(1);
      expect(auditTrailService.findAll).toHaveBeenCalledWith(
        'AuditFinding',
        50,
      );
      expect(auditTrailService.findAll.mock.calls[0][1]).toStrictEqual(50);
    });

    it('defaults the limit to 100 when the query param is absent and still forwards resource', async () => {
      await controller.findAll('audit-findings', undefined);

      expect(auditTrailService.findAll).toHaveBeenCalledWith(
        'audit-findings',
        100,
      );
    });

    it('passes undefined resource through unchanged when no filter is given', async () => {
      await controller.findAll(undefined, undefined);

      expect(auditTrailService.findAll).toHaveBeenCalledWith(undefined, 100);
      expect(auditTrailService.findAll.mock.calls[0]).toHaveLength(2);
    });

    it('coi tham số rỗng/toàn khoảng trắng như không truyền (dùng mặc định 100)', async () => {
      await controller.findAll('AuditFinding', '');
      await controller.findAll('AuditFinding', '   ');

      expect(auditTrailService.findAll.mock.calls[0][1]).toBe(100);
      expect(auditTrailService.findAll.mock.calls[1][1]).toBe(100);
    });

    it('REGRESSION: từ chối limit không phải số nguyên dương bằng BadRequestException (không còn NaN/-5 tới Postgres)', async () => {
      for (const bad of ['abc', '-5', '0', '1.5', '1e3', '+3', 'NaN']) {
        await expect(controller.findAll('AuditFinding', bad)).rejects.toThrow(
          BadRequestException,
        );
      }
      expect(auditTrailService.findAll).not.toHaveBeenCalled();
    });

    it('REGRESSION: cắt (cap) limit vượt trần 500 thay vì đẩy truy vấn quá lớn', async () => {
      await controller.findAll('AuditFinding', '1000');

      expect(auditTrailService.findAll).toHaveBeenCalledWith(
        'AuditFinding',
        500,
      );
    });

    it('returns the service result unchanged (no wrapping envelope)', async () => {
      const rows = [{ id: 1, action: 'UPDATE', resource: 'AuditFinding' }];
      auditTrailService.findAll.mockResolvedValueOnce(rows);

      await expect(controller.findAll('AuditFinding', '10')).resolves.toBe(
        rows,
      );
    });
  });

  describe('getSecurityAlerts (GET /api/audit-trail/security-alerts)', () => {
    it('delegates to findAllAlerts with no arguments and returns the page unchanged', async () => {
      const alerts = [{ id: 1, type: 'UNAUTHORIZED_ACCESS', severity: 'High' }];
      auditTrailService.findAllAlerts.mockResolvedValueOnce(alerts);

      const result = await controller.getSecurityAlerts();

      expect(auditTrailService.findAllAlerts).toHaveBeenCalledTimes(1);
      expect(auditTrailService.findAllAlerts).toHaveBeenCalledWith();
      expect(result).toBe(alerts);
    });
  });

  describe('findMyActions (GET /api/audit-trail/my-actions) — chống IDOR', () => {
    it('trả về lịch sử của CHÍNH người gọi lấy từ JWT khi không truyền userId', async () => {
      await controller.findMyActions(authedReq());

      expect(auditTrailService.findByUser).toHaveBeenCalledTimes(1);
      expect(auditTrailService.findByUser).toHaveBeenCalledWith(9);
      expect(auditTrailService.findByUser.mock.calls[0][0]).toStrictEqual(9);
    });

    it('chấp nhận userId trùng với người gọi (coi như alias của chính mình)', async () => {
      await controller.findMyActions(authedReq(), '9');

      expect(auditTrailService.findByUser).toHaveBeenCalledWith(9);
    });

    it('REGRESSION (IDOR): chặn đọc lịch sử của người khác bằng ForbiddenException khi không có quyền AuditTrail', async () => {
      await expect(
        controller.findMyActions(authedReq(), '12345'),
      ).rejects.toThrow(ForbiddenException);

      // tuyệt đối không trả dữ liệu của người khác
      expect(auditTrailService.findByUser).not.toHaveBeenCalled();
      expect(caslAbilityFactory.createForUser).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 9 }),
      );
    });

    it('cho phép tài khoản có quyền manage:AuditTrail tra cứu hộ người khác', async () => {
      caslAbilityFactory.createForUser.mockReturnValueOnce({
        can: jest.fn().mockReturnValue(true),
      });

      await controller.findMyActions(authedReq(), '12345');

      expect(auditTrailService.findByUser).toHaveBeenCalledWith(12345);
    });

    it('REGRESSION: từ chối userId không phải số nguyên dương thay vì truy vấn NaN', async () => {
      for (const bad of ['abc', '-1', '0', '2.5']) {
        await expect(
          controller.findMyActions(authedReq(), bad),
        ).rejects.toThrow(BadRequestException);
      }
      expect(auditTrailService.findByUser).not.toHaveBeenCalled();
    });

    it('REGRESSION: thiếu danh tính trong token ⇒ UnauthorizedException (không suy đoán người dùng)', async () => {
      await expect(
        controller.findMyActions({ user: undefined } as any),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        controller.findMyActions({ user: { userId: 0 } } as any),
      ).rejects.toThrow(UnauthorizedException);

      expect(auditTrailService.findByUser).not.toHaveBeenCalled();
    });
  });

  describe('verifyIntegrity (GET /api/audit-trail/:id/verify)', () => {
    it('ép id về số và uỷ quyền cho service kiểm tra mã băm', async () => {
      auditTrailService.verifyIntegrity.mockResolvedValueOnce({ valid: true });

      await expect(controller.verifyIntegrity('42')).resolves.toEqual({
        valid: true,
      });
      expect(auditTrailService.verifyIntegrity).toHaveBeenCalledWith(42);
    });

    it('REGRESSION: id không hợp lệ ⇒ BadRequestException, không gọi service', async () => {
      for (const bad of ['abc', '0', '-7', '1.5']) {
        await expect(controller.verifyIntegrity(bad)).rejects.toThrow(
          BadRequestException,
        );
      }
      expect(auditTrailService.verifyIntegrity).not.toHaveBeenCalled();
    });

    it('yêu cầu quyền manage:AuditTrail (không mở public)', () => {
      const handlers = Reflect.getMetadata(
        CHECK_POLICIES_KEY,
        controller.verifyIntegrity,
      ) as Array<(ability: any) => boolean>;
      expect(handlers).toHaveLength(1);

      const ability = { can: jest.fn().mockReturnValue(true) };
      expect(handlers[0](ability)).toBe(true);
      expect(ability.can).toHaveBeenCalledWith(Action.Manage, 'AuditTrail');
    });
  });

  describe('cleanup (DELETE /api/audit-trail/cleanup)', () => {
    it('coerces the months query string to a number and forwards the acting user for the purge audit entry', async () => {
      const result = await controller.cleanup(authedReq(), '3');

      expect(auditTrailService.cleanupLogs).toHaveBeenCalledTimes(1);
      expect(auditTrailService.cleanupLogs).toHaveBeenCalledWith(
        3,
        expect.objectContaining({
          userId: 9,
          username: 'auditor1',
          ipAddress: '10.1.2.3',
          userAgent: 'jest-agent',
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          deleted: 0,
          cutoffDate: new Date(0),
        }),
      );
    });

    it('defaults to 6 months when the query param is absent', async () => {
      await controller.cleanup(authedReq(), undefined);

      expect(auditTrailService.cleanupLogs).toHaveBeenCalledWith(
        6,
        expect.any(Object),
      );
    });

    it('REGRESSION: từ chối months=0 / âm / không phải số (trước đây months=0 xoá sạch log cũ hơn hiện tại)', async () => {
      for (const bad of ['0', '-2', 'abc', '1.5']) {
        await expect(controller.cleanup(authedReq(), bad)).rejects.toThrow(
          BadRequestException,
        );
      }
      expect(auditTrailService.cleanupLogs).not.toHaveBeenCalled();
    });

    it('RỦI RO CÒN LẠI (đã ghi nhận): purge vẫn mở qua HTTP và chỉ được bảo vệ bằng policy AuditTrail chung', async () => {
      await controller.cleanup(authedReq(), '6');

      // the only authorisation on the endpoint is the generic AuditTrail Manage policy
      const handlers = Reflect.getMetadata(
        CHECK_POLICIES_KEY,
        controller.cleanup,
      ) as Array<(ability: any) => boolean>;
      expect(handlers).toHaveLength(1);

      const ability = { can: jest.fn().mockReturnValue(true) };
      expect(handlers[0](ability)).toBe(true);
      expect(ability.can).toHaveBeenCalledWith(Action.Manage, 'AuditTrail');
      // no confirmation token / dry-run flag / soft-delete option is accepted by the endpoint
      expect(auditTrailService.cleanupLogs.mock.calls[0][0]).toBe(6);
      expect(Reflect.getMetadata('path', controller.cleanup)).toBe('cleanup');
    });
  });

  describe('authorisation metadata', () => {
    it('applies JwtAuthGuard and PoliciesGuard to the whole controller', () => {
      // Nest stores @UseGuards() metadata under the '__guards__' key.
      expect(Reflect.getMetadata('__guards__', AuditTrailController)).toEqual([
        JwtAuthGuard,
        PoliciesGuard,
      ]);
    });

    it('requires the AuditTrail Manage policy on findAll, security-alerts, verify and cleanup', () => {
      const targets: Array<[string, any]> = [
        ['findAll', controller.findAll],
        ['getSecurityAlerts', controller.getSecurityAlerts],
        ['verifyIntegrity', controller.verifyIntegrity],
        ['cleanup', controller.cleanup],
      ];

      for (const [name, handler] of targets) {
        const handlers = Reflect.getMetadata(CHECK_POLICIES_KEY, handler);
        expect(Array.isArray(handlers)).toBe(true);
        expect(handlers).toHaveLength(1);

        const ability = { can: jest.fn().mockReturnValue(true) };
        expect(handlers[0](ability)).toBe(true);
        expect(ability.can).toHaveBeenCalledWith(Action.Manage, 'AuditTrail');
        expect(name).toBeTruthy();
      }
    });

    it('my-actions KHÔNG dùng policy chung — quyền sở hữu được ép trong code (xem findMyActions)', () => {
      expect(
        Reflect.getMetadata(CHECK_POLICIES_KEY, controller.findMyActions),
      ).toBeUndefined();
      expect(
        Reflect.getMetadata(CHECK_POLICIES_KEY, controller.findAll),
      ).toBeDefined();
    });
  });

  describe('route metadata', () => {
    it.each([
      ['findAll', '/', RequestMethod.GET],
      ['getSecurityAlerts', 'security-alerts', RequestMethod.GET],
      ['findMyActions', 'my-actions', RequestMethod.GET],
      ['verifyIntegrity', ':id/verify', RequestMethod.GET],
      ['cleanup', 'cleanup', RequestMethod.DELETE],
    ])(
      'exposes %s at %s with the expected HTTP verb',
      (methodName, path, verb) => {
        const handler = (controller as any)[methodName];

        expect(Reflect.getMetadata('path', handler)).toBe(path);
        expect(Reflect.getMetadata('method', handler)).toBe(verb);
      },
    );
  });
});
