import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod, UnauthorizedException } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { KeycloakService } from './keycloak.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

/**
 * WS2 — `auth.controller.ts` trước đây KHÔNG có spec.
 *
 * Đây là bề mặt tấn công số 1 của hệ thống. Spec khoá lại:
 *  - toàn bộ 24 route (verb + path) — đổi path ở đây là phá vỡ hợp đồng với frontend;
 *  - bất biến phân quyền: các endpoint quản trị PHẢI có PoliciesGuard (JwtAuthGuard
 *    một mình là chưa đủ — mọi người dùng đã đăng nhập đều gọi được);
 *  - các endpoint công khai phải được đánh dấu @Public();
 *  - userId LUÔN lấy từ token, không bao giờ từ body (chống leo thang đặc quyền);
 *  - logout phải thu hồi token (blacklist) từ cookie HOẶC header Authorization.
 */
const routeOf = (handler: (...args: any[]) => any) => ({
  path: Reflect.getMetadata(PATH_METADATA, handler),
  method: Reflect.getMetadata(METHOD_METADATA, handler),
});

const guardNames = (handler: any): string[] =>
  ((Reflect.getMetadata(GUARDS_METADATA, handler) as any[]) || []).map((g) =>
    typeof g === 'function' ? g.name : String(g),
  );

const isPublic = (handler: any): boolean =>
  Reflect.getMetadata(IS_PUBLIC_KEY, handler) === true;

describe('AuthController', () => {
  let controller: AuthController;

  const authService = {
    getPublicAuthConfig: jest.fn(),
    validateUser: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    forgotPassword: jest.fn(),
    ssoLogin: jest.fn(),
    changePassword: jest.fn(),
    validatePasswordComplexity: jest.fn(),
    adminResetPassword: jest.fn(),
    forceChangePassword: jest.fn(),
    unlockAccount: jest.fn(),
    requestPasswordChange: jest.fn(),
    getPasswordChangeRequests: jest.fn(),
    approvePasswordChange: jest.fn(),
    rejectPasswordChange: jest.fn(),
    generateTwoFactorSecret: jest.fn(),
    verifyAndEnableTwoFactor: jest.fn(),
    disableTwoFactor: jest.fn(),
    verifyTwoFactorLogin: jest.fn(),
    blacklistToken: jest.fn(),
  };

  const keycloakService = {
    getPublicConfig: jest.fn(),
    exchangeCodeForTokens: jest.fn(),
    getUserProfile: jest.fn(),
    getAuthorizationUrl: jest.fn(),
    testConnection: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: KeycloakService, useValue: keycloakService },
        // Guard không được THỰC THI trong spec này (chỉ kiểm tra metadata), nhưng
        // PoliciesGuard vẫn cần dependency của nó để Nest dựng được controller.
        { provide: CaslAbilityFactory, useValue: {} },
      ],
    }).compile();

    controller = moduleRef.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn tiền tố route @Controller("auth")', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AuthController)).toBe('auth');
  });

  describe('metadata route', () => {
    it.each([
      ['getAuthConfig', 'getAuthConfig', 'config', RequestMethod.GET],
      ['login', 'login', 'login', RequestMethod.POST],
      ['register', 'register', 'register', RequestMethod.POST],
      ['forgotPassword', 'forgotPassword', 'forgot-password', RequestMethod.POST],
      ['ssoLogin', 'ssoLogin', 'sso-login', RequestMethod.POST],
      [
        'getKeycloakConfig',
        'getKeycloakConfig',
        'sso/keycloak/config',
        RequestMethod.GET,
      ],
      [
        'exchangeKeycloakCode',
        'exchangeKeycloakCode',
        'sso/keycloak/exchange',
        RequestMethod.POST,
      ],
      [
        'initiateKeycloakLogin',
        'initiateKeycloakLogin',
        'sso/keycloak/login',
        RequestMethod.GET,
      ],
      [
        'handleKeycloakCallback',
        'handleKeycloakCallback',
        'sso/keycloak/callback',
        RequestMethod.GET,
      ],
      [
        'testKeycloakConnection',
        'testKeycloakConnection',
        'sso/keycloak/test-connection',
        RequestMethod.POST,
      ],
      ['changePassword', 'changePassword', 'change-password', RequestMethod.POST],
      [
        'validatePassword',
        'validatePassword',
        'validate-password',
        RequestMethod.POST,
      ],
      [
        'adminResetPassword',
        'adminResetPassword',
        'admin-reset-password',
        RequestMethod.POST,
      ],
      [
        'forceChangePassword',
        'forceChangePassword',
        'force-change-password',
        RequestMethod.POST,
      ],
      ['unlockAccount', 'unlockAccount', 'unlock-account', RequestMethod.POST],
      [
        'requestPasswordChange',
        'requestPasswordChange',
        'request-password-change',
        RequestMethod.POST,
      ],
      [
        'getPasswordChangeRequests',
        'getPasswordChangeRequests',
        'password-change-requests',
        RequestMethod.GET,
      ],
      [
        'approvePasswordChange',
        'approvePasswordChange',
        'approve-password-change',
        RequestMethod.POST,
      ],
      [
        'rejectPasswordChange',
        'rejectPasswordChange',
        'reject-password-change',
        RequestMethod.POST,
      ],
      ['generate2Fa', 'generate2Fa', '2fa/generate', RequestMethod.POST],
      ['turnOn2Fa', 'turnOn2Fa', '2fa/turn-on', RequestMethod.POST],
      ['turnOff2Fa', 'turnOff2Fa', '2fa/turn-off', RequestMethod.POST],
      ['verify2FaLogin', 'verify2FaLogin', 'verify-2fa', RequestMethod.POST],
      ['logout', 'logout', 'logout', RequestMethod.POST],
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

  // ===========================================================================
  // BẤT BIẾN PHÂN QUYỀN
  // ===========================================================================
  describe('bất biến phân quyền', () => {
    it.each([
      'adminResetPassword',
      'forceChangePassword',
      'unlockAccount',
      'getPasswordChangeRequests',
      'approvePasswordChange',
      'rejectPasswordChange',
    ])('%s phải có cả JwtAuthGuard VÀ PoliciesGuard', (methodName) => {
      const guards = guardNames((controller as any)[methodName]);

      expect(guards).toContain(JwtAuthGuard.name);
      expect(guards).toContain(PoliciesGuard.name);
    });

    it.each([
      'changePassword',
      'validatePassword',
      'requestPasswordChange',
      'generate2Fa',
      'turnOn2Fa',
      'turnOff2Fa',
    ])('%s yêu cầu đăng nhập (JwtAuthGuard)', (methodName) => {
      expect(guardNames((controller as any)[methodName])).toContain(
        JwtAuthGuard.name,
      );
    });

    it.each([
      'getAuthConfig',
      'login',
      'register',
      'forgotPassword',
      'ssoLogin',
      'verify2FaLogin',
      'logout',
    ])('%s được đánh dấu @Public()', (methodName) => {
      expect(isPublic((controller as any)[methodName])).toBe(true);
    });

    it('các endpoint quản trị KHÔNG được đánh dấu @Public()', () => {
      for (const m of [
        'adminResetPassword',
        'forceChangePassword',
        'unlockAccount',
        'getPasswordChangeRequests',
        'approvePasswordChange',
        'rejectPasswordChange',
      ]) {
        expect(isPublic((controller as any)[m])).toBe(false);
      }
    });

    it('endpoint 2FA không được đánh dấu @Public()', () => {
      for (const m of ['generate2Fa', 'turnOn2Fa', 'turnOff2Fa']) {
        expect(isPublic((controller as any)[m])).toBe(false);
      }
    });
  });

  // ===========================================================================
  // ĐĂNG NHẬP / ĐĂNG KÝ
  // ===========================================================================
  describe('login()', () => {
    const ip = '10.0.0.9';

    it('xác thực thành công → trả token và gắn cookie httpOnly', async () => {
      authService.validateUser.mockResolvedValue({
        id: 7,
        username: 'ktv01',
        twoFactorEnabled: false,
      });
      authService.login.mockResolvedValue({ access_token: 'tok', user: {} });
      const res = { setCookie: jest.fn(), cookie: jest.fn() };

      const out = await controller.login(
        { username: 'ktv01', password: 'pw' } as any,
        ip,
        res as any,
      );

      // IP được chuyển tiếp để phục vụ audit trail / chống dò mật khẩu
      expect(authService.validateUser).toHaveBeenCalledWith(
        'ktv01',
        'pw',
        ip,
        undefined,
      );
      expect(out).toEqual({ access_token: 'tok', user: {} });
      expect(res.setCookie).toHaveBeenCalledWith(
        'jwt',
        'tok',
        expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
      );
    });

    it('thông tin đăng nhập sai → Unauthorized, không gọi login()', async () => {
      authService.validateUser.mockResolvedValue(null);
      const res = { setCookie: jest.fn(), cookie: jest.fn() };

      await expect(
        controller.login(
          { username: 'ktv01', password: 'sai' } as any,
          ip,
          res as any,
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(authService.login).not.toHaveBeenCalled();
      expect(res.setCookie).not.toHaveBeenCalled();
    });

    it('khi 2FA bật → KHÔNG gắn cookie phiên đầy đủ', async () => {
      authService.validateUser.mockResolvedValue({
        id: 7,
        username: 'ktv01',
        twoFactorEnabled: true,
      });
      authService.login.mockResolvedValue({
        requires2FA: true,
        tempToken: 'temp',
      });
      const res = { setCookie: jest.fn(), cookie: jest.fn() };

      await controller.login(
        { username: 'ktv01', password: 'pw' } as any,
        ip,
        res as any,
      );

      expect(res.setCookie).not.toHaveBeenCalled();
    });

    it('res không có setCookie → bỏ qua việc gắn cookie, không ném lỗi', async () => {
      authService.validateUser.mockResolvedValue({
        id: 7,
        username: 'ktv01',
        twoFactorEnabled: false,
      });
      authService.login.mockResolvedValue({ access_token: 'tok' });
      const res = { cookie: jest.fn() };

      const out = await controller.login(
        { username: 'ktv01', password: 'pw' } as any,
        ip,
        res as any,
      );

      expect(out).toEqual({ access_token: 'tok' });
      expect(res.cookie).not.toHaveBeenCalled();
    });

    it('chuyển tiếp authMode (LOCAL/LDAP/ALL) xuống service', async () => {
      authService.validateUser.mockResolvedValue({
        id: 7,
        username: 'ktv01',
        twoFactorEnabled: false,
      });
      authService.login.mockResolvedValue({ access_token: 'tok' });

      await controller.login(
        { username: 'ktv01', password: 'pw', authMode: 'LDAP' } as any,
        ip,
        { setCookie: jest.fn() } as any,
      );

      expect(authService.validateUser).toHaveBeenCalledWith(
        'ktv01',
        'pw',
        ip,
        'LDAP',
      );
    });
  });

  describe('verify2FaLogin()', () => {
    it('thiếu tempToken hoặc mã OTP → Unauthorized, không gọi service', async () => {
      await expect(
        controller.verify2FaLogin({ tempToken: '', code: '123456' } as any, {} as any),
      ).rejects.toThrow('Thiếu mã xác thực hoặc token hợp lệ');
      await expect(
        controller.verify2FaLogin({ tempToken: 't', code: '' } as any, {} as any),
      ).rejects.toThrow('Thiếu mã xác thực hoặc token hợp lệ');

      expect(authService.verifyTwoFactorLogin).not.toHaveBeenCalled();
    });

    it('OTP hợp lệ → gắn cookie phiên và trả kết quả', async () => {
      authService.verifyTwoFactorLogin.mockResolvedValue({
        access_token: 'full-token',
        user: { username: 'ktv01' },
      });
      const res = { setCookie: jest.fn(), cookie: jest.fn() };

      const out = await controller.verify2FaLogin(
        { tempToken: 'temp', code: '123456' } as any,
        res as any,
      );

      expect(out).toEqual({
        access_token: 'full-token',
        user: { username: 'ktv01' },
      });
      expect(res.setCookie).toHaveBeenCalledWith(
        'jwt',
        'full-token',
        expect.objectContaining({ httpOnly: true }),
      );
    });
  });

  // ===========================================================================
  // LOGOUT — THU HỒI PHIÊN
  // ===========================================================================
  describe('logout()', () => {
    it('blacklist token lấy từ cookie và xoá cookie', async () => {
      const req = { cookies: { jwt: 'cookie-token' }, headers: {} };
      const res = { clearCookie: jest.fn() };

      const out = await controller.logout(req as any, res as any);

      expect(authService.blacklistToken).toHaveBeenCalledWith('cookie-token');
      expect(res.clearCookie).toHaveBeenCalledWith(
        'jwt',
        expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
      );
      expect(out).toEqual({ message: 'Đăng xuất thành công' });
    });

    it('fallback sang header Authorization (bỏ tiền tố Bearer)', async () => {
      const req = {
        cookies: {},
        headers: { authorization: 'Bearer header-token' },
      };
      const res = { clearCookie: jest.fn() };

      await controller.logout(req as any, res as any);

      expect(authService.blacklistToken).toHaveBeenCalledWith('header-token');
    });

    it('header Authorization không phân biệt hoa thường của "bearer"', async () => {
      const req = {
        cookies: {},
        headers: { authorization: 'bearer  spaced-token  ' },
      };

      await controller.logout(req as any, { clearCookie: jest.fn() } as any);

      expect(authService.blacklistToken).toHaveBeenCalledWith('spaced-token');
    });

    it('không có token → không gọi blacklistToken nhưng vẫn xoá cookie', async () => {
      const res = { clearCookie: jest.fn() };

      await controller.logout({ cookies: {}, headers: {} } as any, res as any);

      expect(authService.blacklistToken).not.toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalled();
    });

    it('lỗi khi blacklist token được ném ra ngoài (không im lặng bỏ qua)', async () => {
      authService.blacklistToken.mockRejectedValue(new Error('cache down'));

      await expect(
        controller.logout(
          { cookies: { jwt: 'tok' }, headers: {} } as any,
          { clearCookie: jest.fn() } as any,
        ),
      ).rejects.toThrow('cache down');
    });
  });

  // ===========================================================================
  // ADMIN: userId LUÔN LẤY TỪ TOKEN
  // ===========================================================================
  describe('admin endpoints lấy danh tính admin từ token, không từ body', () => {
    const req = { user: { userId: 1, username: 'admin' } };

    it('adminResetPassword() dùng adminId trong token', async () => {
      authService.adminResetPassword.mockResolvedValue({
        temporaryPassword: 'Temp123!@abcd',
      });

      const out = await controller.adminResetPassword(
        { targetUserId: 9, newPassword: 'Temp123!@abcd' } as any,
        req as any,
      );

      expect(authService.adminResetPassword).toHaveBeenCalledWith(
        1,
        'admin',
        9,
        'Temp123!@abcd',
      );
      expect(out.temporaryPassword).toBe('Temp123!@abcd');
    });

    it('adminResetPassword() bỏ qua adminId giả mạo trong body', async () => {
      authService.adminResetPassword.mockResolvedValue({
        temporaryPassword: 'x',
      });

      await controller.adminResetPassword(
        { targetUserId: 9, adminId: 999, username: 'hacker' } as any,
        req as any,
      );

      expect(authService.adminResetPassword).toHaveBeenCalledWith(
        1,
        'admin',
        9,
        undefined,
      );
    });

    it('approvePasswordChange() ghi vết admin từ token', async () => {
      authService.approvePasswordChange.mockResolvedValue({
        temporaryPassword: 'Tmp123!@abcd',
      });

      await controller.approvePasswordChange(
        { requestId: 5, adminNote: 'OK' } as any,
        req as any,
      );

      expect(authService.approvePasswordChange).toHaveBeenCalledWith(
        5,
        1,
        'admin',
        'OK',
      );
    });

    it('forceChangePassword() / unlockAccount() chuyển đúng targetUserId', async () => {
      await controller.forceChangePassword({ targetUserId: 9 } as any, req as any);
      await controller.unlockAccount({ targetUserId: 9 } as any, req as any);

      expect(authService.forceChangePassword).toHaveBeenCalledWith(9);
      expect(authService.unlockAccount).toHaveBeenCalledWith(9);
    });

    it('getPasswordChangeRequests() chuyển tiếp bộ lọc trạng thái', async () => {
      authService.getPasswordChangeRequests.mockResolvedValue([]);

      await controller.getPasswordChangeRequests('pending');

      expect(authService.getPasswordChangeRequests).toHaveBeenCalledWith(
        'pending',
      );
    });
  });

  // ===========================================================================
  // 2FA — danh tính từ token
  // ===========================================================================
  describe('endpoint 2FA', () => {
    const req = { user: { userId: 7, username: 'ktv01' } };

    it('2fa/generate dùng userId trong token', async () => {
      authService.generateTwoFactorSecret.mockResolvedValue({
        qrCodeDataUrl: 'data:image/png;base64,AAA',
        secret: 'SECRET',
      });

      const out = await controller.generate2Fa(req as any);

      expect(authService.generateTwoFactorSecret).toHaveBeenCalledWith(7);
      expect(out.secret).toBe('SECRET');
    });

    it('2fa/turn-on bật 2FA bằng userId trong token + mã OTP trong body', async () => {
      authService.verifyAndEnableTwoFactor.mockResolvedValue(true);

      const out = await controller.turnOn2Fa({ code: '123456' } as any, req as any);

      expect(authService.verifyAndEnableTwoFactor).toHaveBeenCalledWith(7, '123456');
      expect(out.message).toContain('thành công');
    });

    it('2fa/turn-on KHÔNG nhận userId từ body (chống bật 2FA cho người khác)', async () => {
      authService.verifyAndEnableTwoFactor.mockResolvedValue(true);

      await controller.turnOn2Fa(
        { code: '123456', userId: 999 } as any,
        req as any,
      );

      expect(authService.verifyAndEnableTwoFactor).toHaveBeenCalledWith(7, '123456');
    });

    it('2fa/turn-off tắt 2FA bằng userId trong token', async () => {
      authService.disableTwoFactor.mockResolvedValue(true);

      const out = await controller.turnOff2Fa({ code: '123456' } as any, req as any);

      expect(authService.disableTwoFactor).toHaveBeenCalledWith(7, '123456');
      expect(out.message).toContain('thành công');
    });
  });

  // ===========================================================================
  // ĐỔI MẬT KHẨU
  // ===========================================================================
  describe('changePassword() / validatePassword()', () => {
    it('changePassword() dùng userId trong token', async () => {
      authService.changePassword.mockResolvedValue(undefined);

      const out = await controller.changePassword(
        { currentPassword: 'old', newPassword: 'NewPass123!@' } as any,
        { user: { userId: 7 } } as any,
      );

      expect(authService.changePassword).toHaveBeenCalledWith(
        7,
        'old',
        'NewPass123!@',
      );
      expect(out.message).toContain('thành công');
    });

    it('validatePassword() trả kết quả kiểm tra của service (không tự phán)', async () => {
      authService.validatePasswordComplexity.mockReturnValue({
        valid: false,
        errors: ['Thiếu ký tự đặc biệt'],
      });

      const out = await controller.validatePassword({ password: 'abc' } as any);

      expect(out.valid).toBe(false);
      expect(authService.validatePasswordComplexity).toHaveBeenCalledWith('abc');
    });
  });

  describe('cấu hình công khai', () => {
    it('getAuthConfig() trả cấu hình công khai từ service', async () => {
      const cfg = { localEnabled: true, ldapDomain: 'lpbank.com.vn' };
      authService.getPublicAuthConfig.mockResolvedValue(cfg);

      await expect(controller.getAuthConfig()).resolves.toEqual(cfg);
    });
  });
});
