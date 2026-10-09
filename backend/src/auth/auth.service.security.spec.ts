import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { SecurityConfigService } from '../system-management/security-config.service';
import { PasswordChangeRequest } from './entities/password-change-request.entity';
import { KeycloakService } from './keycloak.service';
import { LdapService } from './ldap.service';

/**
 * WS2 — bổ sung spec cho các nhánh CHƯA được phủ của `auth.service.ts`.
 *
 * `auth.service.spec.ts` đã phủ: độ phức tạp mật khẩu, validateUser, login/2FA ở mức
 * "có token", changePassword và khoá tài khoản sau N lần sai. File này phủ phần còn
 * trống — toàn bộ là bề mặt an ninh:
 *   - thu hồi phiên (blacklist token) khi logout;
 *   - vòng đời 2FA/TOTP: sinh secret → xác nhận → tắt;
 *   - admin reset mật khẩu / buộc đổi / mở khoá tài khoản;
 *   - luồng yêu cầu đổi mật khẩu (chống trùng, chống dò tên đăng nhập, phê duyệt/từ chối);
 *   - sinh mật khẩu tạm bằng CSPRNG;
 *   - SSO/LDAP: cấp tài khoản JIT và KHÔNG rò hash mật khẩu ra ngoài.
 */

jest.mock('otplib', () => ({
  authenticator: {
    generateSecret: jest.fn(),
    keyuri: jest.fn(),
    verify: jest.fn(),
  },
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { authenticator } = require('otplib');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const QRCode = require('qrcode');

describe('AuthService — security edge cases (WS2)', () => {
  let service: AuthService;

  const usersService = {
    findOne: jest.fn(),
    findOneByUsername: jest.fn(),
    create: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const jwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  const passwordChangeRequestRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockImplementation((r) => Promise.resolve({ id: 1, ...r })),
    create: jest.fn().mockImplementation((dto) => dto),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const securityConfig = {
    getNumber: jest.fn((key: string, def: number) => {
      if (key === 'PASSWORD_MIN_LENGTH') return 12;
      if (key === 'MAX_FAILED_ATTEMPTS') return 5;
      if (key === 'LOCKOUT_MINUTES') return 30;
      if (key === 'PASSWORD_EXPIRY_DAYS') return 90;
      if (key === 'PASSWORD_HISTORY_COUNT') return 4;
      return def;
    }),
    getBoolean: jest.fn((_key: string, def: boolean) => def),
    get: jest.fn((_key: string, def: any) => def),
  };

  const cacheManager = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  const keycloakService = {
    findOrCreateUser: jest.fn(),
    getPublicConfig: jest.fn(),
  };

  const ldapService = {
    authenticate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    usersService.update.mockResolvedValue({ affected: 1 });
    cacheManager.get.mockResolvedValue(null);
    cacheManager.set.mockResolvedValue(undefined);
    securityConfig.getBoolean.mockImplementation((_k: string, def: boolean) => def);
    securityConfig.get.mockImplementation((_k: string, def: any) => def);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: getRepositoryToken(PasswordChangeRequest),
          useValue: passwordChangeRequestRepo,
        },
        { provide: SecurityConfigService, useValue: securityConfig },
        { provide: 'CACHE_MANAGER', useValue: cacheManager },
        { provide: KeycloakService, useValue: keycloakService },
        { provide: LdapService, useValue: ldapService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ===========================================================================
  // THU HỒI PHIÊN — blacklist token
  // ===========================================================================
  describe('blacklistToken() / isTokenBlacklisted()', () => {
    it('bỏ qua token rỗng (không ghi cache rác)', async () => {
      await service.blacklistToken('');

      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('đặt TTL bằng đúng thời gian sống còn lại của token', async () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      jwtService.decode.mockReturnValue({ exp });

      await service.blacklistToken('jwt-abc');

      expect(cacheManager.set).toHaveBeenCalledTimes(1);
      const [key, val, ttl] = cacheManager.set.mock.calls[0];
      expect(key).toBe('blacklist:token:jwt-abc');
      expect(val).toBe(true);
      expect(ttl).toBeGreaterThan(3_590_000);
      expect(ttl).toBeLessThanOrEqual(3_600_000);
    });

    it('token đã hết hạn vẫn được ghi vào blacklist với TTL tối thiểu 1s', async () => {
      jwtService.decode.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) - 7200,
      });

      await service.blacklistToken('jwt-expired');

      expect(cacheManager.set).toHaveBeenCalledWith(
        'blacklist:token:jwt-expired',
        true,
        1000,
      );
    });

    it('token không có exp dùng TTL mặc định 8 giờ', async () => {
      jwtService.decode.mockReturnValue({ sub: 1 });

      await service.blacklistToken('jwt-no-exp');

      expect(cacheManager.set).toHaveBeenCalledWith(
        'blacklist:token:jwt-no-exp',
        true,
        8 * 3600 * 1000,
      );
    });

    it('token hỏng (decode ném lỗi) vẫn được blacklist 8 giờ — không nuốt lỗi âm thầm', async () => {
      jwtService.decode.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      await service.blacklistToken('not-a-jwt');

      expect(cacheManager.set).toHaveBeenCalledWith(
        'blacklist:token:not-a-jwt',
        true,
        8 * 3600 * 1000,
      );
    });

    it('isTokenBlacklisted("") trả false, không truy vấn cache', async () => {
      await expect(service.isTokenBlacklisted('')).resolves.toBe(false);
      expect(cacheManager.get).not.toHaveBeenCalled();
    });

    it('isTokenBlacklisted trả true khi token có trong blacklist', async () => {
      cacheManager.get.mockResolvedValue(true);

      await expect(service.isTokenBlacklisted('jwt-abc')).resolves.toBe(true);
      expect(cacheManager.get).toHaveBeenCalledWith('blacklist:token:jwt-abc');
    });

    it('isTokenBlacklisted trả false khi cache trống', async () => {
      cacheManager.get.mockResolvedValue(null);

      await expect(service.isTokenBlacklisted('jwt-abc')).resolves.toBe(false);
    });

    it('isTokenBlacklisted FAIL-OPEN khi cache lỗi (ghi nhận trade-off đã biết)', async () => {
      // Hành vi hiện tại: lỗi cache => coi như token hợp lệ. Test này khoá lại hành vi
      // thực tế để nếu sau này đổi sang fail-closed thì có chủ đích, không vô tình.
      cacheManager.get.mockRejectedValue(new Error('redis down'));

      await expect(service.isTokenBlacklisted('jwt-abc')).resolves.toBe(false);
    });
  });

  // ===========================================================================
  // 2FA / TOTP
  // ===========================================================================
  describe('generateTwoFactorSecret()', () => {
    it('ném BadRequest khi người dùng không tồn tại', async () => {
      usersService.findOne.mockResolvedValue(null);

      await expect(service.generateTwoFactorSecret(404)).rejects.toThrow(
        BadRequestException,
      );
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('sinh secret, lưu vào twoFactorTempSecret và trả QR data URL', async () => {
      usersService.findOne.mockResolvedValue({ id: 7, username: 'ktv01' });
      authenticator.generateSecret.mockReturnValue('SECRET123');
      authenticator.keyuri.mockReturnValue('otpauth://totp/...');
      (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,AAA');

      const res = await service.generateTwoFactorSecret(7);

      expect(res).toEqual({
        qrCodeDataUrl: 'data:image/png;base64,AAA',
        secret: 'SECRET123',
      });
      expect(authenticator.keyuri).toHaveBeenCalledWith(
        'ktv01',
        'LPBank Smart Audit',
        'SECRET123',
      );
      expect(usersService.update).toHaveBeenCalledWith(7, {
        twoFactorTempSecret: 'SECRET123',
      });
    });

    it('KHÔNG bật 2FA khi mới sinh secret (phải chờ xác nhận OTP)', async () => {
      usersService.findOne.mockResolvedValue({ id: 7, username: 'ktv01' });
      authenticator.generateSecret.mockReturnValue('SECRET123');
      authenticator.keyuri.mockReturnValue('otpauth://totp/...');
      (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,AAA');

      await service.generateTwoFactorSecret(7);

      const payload = usersService.update.mock.calls[0][1];
      expect(payload).not.toHaveProperty('twoFactorEnabled');
      expect(payload).not.toHaveProperty('twoFactorSecret');
    });
  });

  describe('verifyAndEnableTwoFactor()', () => {
    it('ném BadRequest khi chưa có yêu cầu kích hoạt (thiếu temp secret)', async () => {
      usersService.findOne.mockResolvedValue({ id: 7, twoFactorTempSecret: null });

      await expect(service.verifyAndEnableTwoFactor(7, '123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('ném BadRequest khi người dùng không tồn tại', async () => {
      usersService.findOne.mockResolvedValue(null);

      await expect(service.verifyAndEnableTwoFactor(7, '123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('OTP sai → Unauthorized và TUYỆT ĐỐI không bật 2FA', async () => {
      usersService.findOne.mockResolvedValue({
        id: 7,
        twoFactorTempSecret: 'SECRET123',
      });
      authenticator.verify.mockReturnValue(false);

      await expect(service.verifyAndEnableTwoFactor(7, '000000')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('OTP đúng → chuyển temp secret thành secret chính thức và bật 2FA', async () => {
      usersService.findOne.mockResolvedValue({
        id: 7,
        twoFactorTempSecret: 'SECRET123',
      });
      authenticator.verify.mockReturnValue(true);

      await expect(service.verifyAndEnableTwoFactor(7, '123456')).resolves.toBe(
        true,
      );
      expect(authenticator.verify).toHaveBeenCalledWith({
        token: '123456',
        secret: 'SECRET123',
      });
      expect(usersService.update).toHaveBeenCalledWith(7, {
        twoFactorSecret: 'SECRET123',
        twoFactorEnabled: true,
        twoFactorTempSecret: null,
      });
    });
  });

  describe('disableTwoFactor()', () => {
    it('ném BadRequest khi 2FA chưa kích hoạt', async () => {
      usersService.findOne.mockResolvedValue({
        id: 7,
        twoFactorEnabled: false,
        twoFactorSecret: null,
      });

      await expect(service.disableTwoFactor(7, '123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('ném BadRequest khi thiếu secret dù cờ enabled = true (dữ liệu không nhất quán)', async () => {
      usersService.findOne.mockResolvedValue({
        id: 7,
        twoFactorEnabled: true,
        twoFactorSecret: null,
      });

      await expect(service.disableTwoFactor(7, '123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('OTP sai → Unauthorized và 2FA vẫn được giữ nguyên', async () => {
      usersService.findOne.mockResolvedValue({
        id: 7,
        twoFactorEnabled: true,
        twoFactorSecret: 'SECRET123',
      });
      authenticator.verify.mockReturnValue(false);

      await expect(service.disableTwoFactor(7, '000000')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('OTP đúng → xoá secret và tắt 2FA', async () => {
      usersService.findOne.mockResolvedValue({
        id: 7,
        twoFactorEnabled: true,
        twoFactorSecret: 'SECRET123',
      });
      authenticator.verify.mockReturnValue(true);

      await expect(service.disableTwoFactor(7, '123456')).resolves.toBe(true);
      expect(usersService.update).toHaveBeenCalledWith(7, {
        twoFactorSecret: null,
        twoFactorEnabled: false,
        twoFactorTempSecret: null,
      });
    });
  });

  describe('verifyTwoFactorLogin()', () => {
    it('token tạm hết hạn/hỏng → Unauthorized với thông báo phiên hết hạn', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(
        service.verifyTwoFactorLogin('expired-token', '123456'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.verifyTwoFactorLogin('expired-token', '123456'),
      ).rejects.toThrow('Phiên xác thực 2FA đã hết hạn');
    });

    it('token tạm không mang cờ require2FA → BadRequest', async () => {
      jwtService.verify.mockReturnValue({ sub: 7 });

      await expect(
        service.verifyTwoFactorLogin('temp', '123456'),
      ).rejects.toThrow(BadRequestException);
    });

    it('token tạm không có sub → BadRequest', async () => {
      jwtService.verify.mockReturnValue({ require2FA: true });

      await expect(
        service.verifyTwoFactorLogin('temp', '123456'),
      ).rejects.toThrow(BadRequestException);
    });

    it('người dùng chưa kích hoạt 2FA → BadRequest', async () => {
      jwtService.verify.mockReturnValue({ require2FA: true, sub: 7 });
      usersService.findOne.mockResolvedValue({ id: 7, twoFactorSecret: null });

      await expect(
        service.verifyTwoFactorLogin('temp', '123456'),
      ).rejects.toThrow('Người dùng chưa kích hoạt 2FA');
    });

    it('OTP sai → Unauthorized và KHÔNG cấp access token', async () => {
      jwtService.verify.mockReturnValue({ require2FA: true, sub: 7 });
      usersService.findOne.mockResolvedValue({
        id: 7,
        twoFactorSecret: 'SECRET123',
      });
      authenticator.verify.mockReturnValue(false);

      await expect(
        service.verifyTwoFactorLogin('temp', '000000'),
      ).rejects.toThrow(UnauthorizedException);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('OTP đúng → cấp access token đầy đủ (không còn cờ 2FA)', async () => {
      jwtService.verify.mockReturnValue({ require2FA: true, sub: 7 });
      usersService.findOne.mockResolvedValue({
        id: 7,
        username: 'ktv01',
        fullName: 'Nguyễn Văn A',
        twoFactorSecret: 'SECRET123',
        role: { name: 'Kiểm toán viên', permissions: 'read' },
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      });
      authenticator.verify.mockReturnValue(true);

      const res = await service.verifyTwoFactorLogin('temp', '123456');

      expect(res.access_token).toBe('mock-jwt-token');
      expect(res.user.username).toBe('ktv01');
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'ktv01', sub: 7 }),
      );
    });
  });

  // ===========================================================================
  // ADMIN: RESET / FORCE CHANGE / UNLOCK
  // ===========================================================================
  describe('adminResetPassword()', () => {
    it('ném BadRequest khi người dùng đích không tồn tại', async () => {
      usersService.findOne.mockResolvedValue(null);

      await expect(
        service.adminResetPassword(1, 'admin', 404),
      ).rejects.toThrow(BadRequestException);
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('mật khẩu do admin nhập không đạt chuẩn → BadRequest, KHÔNG ghi DB', async () => {
      usersService.findOne.mockResolvedValue({
        id: 9,
        passwordHash: 'old-hash',
      });

      await expect(
        service.adminResetPassword(1, 'admin', 9, 'yeu'),
      ).rejects.toThrow(BadRequestException);
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('đặt mật khẩu tạm, bật mustChangePassword và xoá khoá đăng nhập', async () => {
      usersService.findOne.mockResolvedValue({
        id: 9,
        passwordHash: 'old-hash',
        passwordHistory: null,
      });

      const res = await service.adminResetPassword(1, 'admin', 9, 'TempPass123!@');

      expect(res.temporaryPassword).toBe('TempPass123!@');
      expect(usersService.update).toHaveBeenCalledWith(
        9,
        expect.objectContaining({
          password: 'TempPass123!@',
          mustChangePassword: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
        }),
      );
    });

    it('lưu hash cũ vào lịch sử mật khẩu (chống tái sử dụng)', async () => {
      usersService.findOne.mockResolvedValue({
        id: 9,
        passwordHash: 'old-hash',
        passwordHistory: JSON.stringify(['h1', 'h2']),
      });

      await service.adminResetPassword(1, 'admin', 9, 'TempPass123!@');

      const historyCall = usersService.update.mock.calls.find((c) =>
        Object.prototype.hasOwnProperty.call(c[1], 'passwordHistory'),
      );
      expect(historyCall).toBeDefined();
      const history = JSON.parse(historyCall![1].passwordHistory);
      expect(history[0]).toBe('old-hash');
      expect(history).toHaveLength(3);
    });

    it('lịch sử mật khẩu hỏng (JSON không hợp lệ) không làm hỏng luồng reset', async () => {
      usersService.findOne.mockResolvedValue({
        id: 9,
        passwordHash: 'old-hash',
        passwordHistory: '{not-json',
      });

      await expect(
        service.adminResetPassword(1, 'admin', 9, 'TempPass123!@'),
      ).resolves.toEqual({ temporaryPassword: 'TempPass123!@' });

      const historyCall = usersService.update.mock.calls.find((c) =>
        Object.prototype.hasOwnProperty.call(c[1], 'passwordHistory'),
      );
      expect(JSON.parse(historyCall![1].passwordHistory)).toEqual(['old-hash']);
    });

    it('không truyền mật khẩu → tự sinh mật khẩu tạm đạt chuẩn độ phức tạp', async () => {
      usersService.findOne.mockResolvedValue({
        id: 9,
        passwordHash: 'old-hash',
      });

      const res = await service.adminResetPassword(1, 'admin', 9);

      expect(res.temporaryPassword).toHaveLength(16);
      expect(service.validatePasswordComplexity(res.temporaryPassword).valid).toBe(
        true,
      );
    });
  });

  describe('forceChangePassword()', () => {
    it('ném BadRequest khi người dùng không tồn tại', async () => {
      usersService.findOne.mockResolvedValue(null);

      await expect(service.forceChangePassword(404)).rejects.toThrow(
        BadRequestException,
      );
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('chỉ bật cờ mustChangePassword, không đổi mật khẩu', async () => {
      usersService.findOne.mockResolvedValue({ id: 9, username: 'ktv09' });

      await expect(service.forceChangePassword(9)).resolves.toBeUndefined();
      expect(usersService.update).toHaveBeenCalledWith(9, {
        mustChangePassword: true,
      });
    });
  });

  describe('unlockAccount()', () => {
    it('ném BadRequest khi người dùng không tồn tại', async () => {
      usersService.findOne.mockResolvedValue(null);

      await expect(service.unlockAccount(404)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('xoá số lần đăng nhập sai và thời điểm mở khoá', async () => {
      usersService.findOne.mockResolvedValue({ id: 9, lockedUntil: new Date() });

      await expect(service.unlockAccount(9)).resolves.toBeUndefined();
      expect(usersService.update).toHaveBeenCalledWith(9, {
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
    });
  });

  // ===========================================================================
  // LUỒNG YÊU CẦU ĐỔI MẬT KHẨU
  // ===========================================================================
  describe('requestPasswordChange()', () => {
    it('chặn tạo yêu cầu trùng khi đang có yêu cầu chờ duyệt', async () => {
      passwordChangeRequestRepo.findOne.mockResolvedValue({
        id: 5,
        status: 'pending',
      });

      await expect(
        service.requestPasswordChange(3, 'ktv03'),
      ).rejects.toThrow(BadRequestException);
      expect(passwordChangeRequestRepo.save).not.toHaveBeenCalled();
    });

    it('tạo yêu cầu pending với lý do mặc định khi không truyền lý do', async () => {
      passwordChangeRequestRepo.findOne.mockResolvedValue(null);

      const res = await service.requestPasswordChange(3, 'ktv03');

      expect(passwordChangeRequestRepo.create).toHaveBeenCalledWith({
        userId: 3,
        username: 'ktv03',
        reason: 'Yêu cầu đổi mật khẩu',
        status: 'pending',
      });
      expect(res.status).toBe('pending');
    });

    it('giữ nguyên lý do do người dùng nhập', async () => {
      passwordChangeRequestRepo.findOne.mockResolvedValue(null);

      await service.requestPasswordChange(3, 'ktv03', 'Quên mật khẩu');

      expect(passwordChangeRequestRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'Quên mật khẩu' }),
      );
    });
  });

  describe('forgotPassword()', () => {
    it('ném BadRequest khi thiếu tên đăng nhập', async () => {
      await expect(service.forgotPassword('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('tên đăng nhập không tồn tại → im lặng thành công (chống dò tài khoản)', async () => {
      usersService.findOneByUsername.mockResolvedValue(null);

      await expect(service.forgotPassword('khong-ton-tai')).resolves.toBeUndefined();
      expect(passwordChangeRequestRepo.save).not.toHaveBeenCalled();
    });

    it('tên đăng nhập hợp lệ → tạo yêu cầu cấp lại mật khẩu', async () => {
      usersService.findOneByUsername.mockResolvedValue({
        id: 3,
        username: 'ktv03',
      });
      passwordChangeRequestRepo.findOne.mockResolvedValue(null);

      await service.forgotPassword('ktv03');

      expect(passwordChangeRequestRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 3,
          username: 'ktv03',
          reason: 'Quên mật khẩu, yêu cầu cấp lại',
        }),
      );
    });
  });

  describe('getPasswordChangeRequests()', () => {
    it('không lọc trạng thái → lấy tất cả, mới nhất trước', async () => {
      await service.getPasswordChangeRequests();

      expect(passwordChangeRequestRepo.find).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
      });
    });

    it('lọc theo trạng thái khi được truyền vào', async () => {
      await service.getPasswordChangeRequests('pending');

      expect(passwordChangeRequestRepo.find).toHaveBeenCalledWith({
        where: { status: 'pending' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('approvePasswordChange()', () => {
    it('ném BadRequest khi yêu cầu không tồn tại', async () => {
      passwordChangeRequestRepo.findOne.mockResolvedValue(null);

      await expect(
        service.approvePasswordChange(999, 1, 'admin'),
      ).rejects.toThrow(BadRequestException);
    });

    it('ném BadRequest khi yêu cầu đã được xử lý (chống duyệt hai lần)', async () => {
      passwordChangeRequestRepo.findOne.mockResolvedValue({
        id: 5,
        status: 'approved',
      });

      await expect(
        service.approvePasswordChange(5, 1, 'admin'),
      ).rejects.toThrow('Yêu cầu đã được xử lý');
      expect(passwordChangeRequestRepo.update).not.toHaveBeenCalled();
    });

    it('duyệt → reset mật khẩu người dùng và ghi vết admin xử lý', async () => {
      passwordChangeRequestRepo.findOne.mockResolvedValue({
        id: 5,
        userId: 9,
        status: 'pending',
      });
      usersService.findOne.mockResolvedValue({
        id: 9,
        passwordHash: 'old-hash',
      });

      const res = await service.approvePasswordChange(5, 1, 'admin', 'OK nhé');

      expect(res.temporaryPassword).toHaveLength(16);
      expect(usersService.update).toHaveBeenCalledWith(
        9,
        expect.objectContaining({ mustChangePassword: true }),
      );
      expect(passwordChangeRequestRepo.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          status: 'approved',
          adminId: 1,
          adminUsername: 'admin',
          adminNote: 'OK nhé',
        }),
      );
    });

    it('duyệt → dùng ghi chú mặc định khi admin không nhập', async () => {
      passwordChangeRequestRepo.findOne.mockResolvedValue({
        id: 5,
        userId: 9,
        status: 'pending',
      });
      usersService.findOne.mockResolvedValue({
        id: 9,
        passwordHash: 'old-hash',
      });

      await service.approvePasswordChange(5, 1, 'admin');

      expect(passwordChangeRequestRepo.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          adminNote: 'Đã phê duyệt và tạo mật khẩu tạm thời',
        }),
      );
    });
  });

  describe('rejectPasswordChange()', () => {
    it('ném BadRequest khi yêu cầu không tồn tại', async () => {
      passwordChangeRequestRepo.findOne.mockResolvedValue(null);

      await expect(service.rejectPasswordChange(999, 1, 'admin')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('ném BadRequest khi yêu cầu đã được xử lý', async () => {
      passwordChangeRequestRepo.findOne.mockResolvedValue({
        id: 5,
        status: 'rejected',
      });

      await expect(service.rejectPasswordChange(5, 1, 'admin')).rejects.toThrow(
        'Yêu cầu đã được xử lý',
      );
    });

    it('từ chối → đánh dấu rejected kèm ghi chú mặc định, KHÔNG đổi mật khẩu', async () => {
      passwordChangeRequestRepo.findOne.mockResolvedValue({
        id: 5,
        userId: 9,
        status: 'pending',
      });

      await expect(
        service.rejectPasswordChange(5, 1, 'admin'),
      ).resolves.toBeUndefined();

      expect(passwordChangeRequestRepo.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          status: 'rejected',
          adminId: 1,
          adminUsername: 'admin',
          adminNote: 'Từ chối yêu cầu',
        }),
      );
      expect(usersService.update).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // SINH MẬT KHẨU
  // ===========================================================================
  describe('generateSecurePassword()', () => {
    it('dài 16 ký tự và chứa đủ 4 nhóm ký tự', () => {
      const pwd = service.generateSecurePassword();

      expect(pwd).toHaveLength(16);
      expect(/[A-Z]/.test(pwd)).toBe(true);
      expect(/[a-z]/.test(pwd)).toBe(true);
      expect(/[0-9]/.test(pwd)).toBe(true);
      expect(/[!@#$%^&*()\-_=+]/.test(pwd)).toBe(true);
    });

    it('luôn vượt qua kiểm tra độ phức tạp của chính hệ thống', () => {
      for (let i = 0; i < 25; i++) {
        expect(
          service.validatePasswordComplexity(service.generateSecurePassword())
            .valid,
        ).toBe(true);
      }
    });

    it('không lặp lại giữa các lần gọi (dùng nguồn ngẫu nhiên thật)', () => {
      const set = new Set(
        Array.from({ length: 50 }, () => service.generateSecurePassword()),
      );

      expect(set.size).toBe(50);
    });
  });

  // ===========================================================================
  // SSO / LDAP
  // ===========================================================================
  describe('ssoLogin()', () => {
    it('người dùng đã tồn tại → cấp token, không tạo mới', async () => {
      usersService.findOneByUsername.mockResolvedValue({
        id: 11,
        username: 'ktv11',
        fullName: 'Trần Thị B',
        role: { name: 'Kiểm toán viên', permissions: 'read' },
      });

      const res = await service.ssoLogin('ktv11');

      expect(usersService.create).not.toHaveBeenCalled();
      expect(res.access_token).toBe('mock-jwt-token');
      expect(res.user.isSso).toBe(true);
    });

    it('người dùng mới → tạo tài khoản với mật khẩu NGẪU NHIÊN, không phải mật khẩu mặc định đoán được', async () => {
      usersService.findOneByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue({
        id: 12,
        username: 'ktv12',
        fullName: 'ktv12 (SSO)',
        role: 'Kiểm toán viên',
      });

      await service.ssoLogin('ktv12');

      const created = usersService.create.mock.calls[0][0];
      expect(created.username).toBe('ktv12');
      expect(created.password).toHaveLength(16);
      expect(service.validatePasswordComplexity(created.password).valid).toBe(true);
      // Không được dùng mật khẩu mặc định/đoán được
      expect(['password', '123456', 'Password123!', 'ktv12']).not.toContain(
        created.password,
      );
    });
  });

  describe('handleKeycloakLogin()', () => {
    it('ném Unauthorized khi Keycloak không được cấu hình', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: UsersService, useValue: usersService },
          { provide: JwtService, useValue: jwtService },
          {
            provide: getRepositoryToken(PasswordChangeRequest),
            useValue: passwordChangeRequestRepo,
          },
          { provide: SecurityConfigService, useValue: securityConfig },
          { provide: 'CACHE_MANAGER', useValue: cacheManager },
        ],
      }).compile();
      const bare = module.get<AuthService>(AuthService);

      await expect(
        bare.handleKeycloakLogin({ username: 'ktv01' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('cấp token với vai trò lấy từ người dùng do Keycloak ánh xạ', async () => {
      keycloakService.findOrCreateUser.mockResolvedValue({
        id: 21,
        username: 'sso.user',
        fullName: 'SSO User',
        email: 'sso.user@bank.com',
        role: { name: 'Trưởng đoàn', permissions: 'read,write' },
        department: { id: 3, name: 'KTNB' },
      });

      const res = await service.handleKeycloakLogin({
        username: 'sso.user',
      } as any);

      expect(res.access_token).toBe('mock-jwt-token');
      expect(res.user.role).toBe('Trưởng đoàn');
      expect(res.user.permissions).toBe('read,write');
      expect(res.user.isSso).toBe(true);
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'sso.user',
          sub: 21,
          role: 'Trưởng đoàn',
          mustChangePassword: false,
          isPasswordExpired: false,
        }),
      );
    });
  });

  describe('findOrCreateLdapUser()', () => {
    it('người dùng đã tồn tại và đang hoạt động → trả hồ sơ, KHÔNG tạo mới', async () => {
      usersService.findOneByUsername.mockResolvedValue({
        id: 31,
        username: 'ktv31',
        isActive: true,
      });

      const res = await service.findOrCreateLdapUser('ktv31');

      expect(usersService.create).not.toHaveBeenCalled();
      expect(res.id).toBe(31);
    });

    it('KHÔNG rò hash mật khẩu / lịch sử mật khẩu ra ngoài', async () => {
      usersService.findOneByUsername.mockResolvedValue({
        id: 31,
        username: 'ktv31',
        isActive: true,
        passwordHash: '$2b$10$super-secret-hash',
        passwordHistory: '["h1"]',
      });

      const res = await service.findOrCreateLdapUser('ktv31');

      expect(res).not.toHaveProperty('passwordHash');
      expect(res).not.toHaveProperty('passwordHistory');
      expect(JSON.stringify(res)).not.toContain('super-secret-hash');
    });

    it('tài khoản bị vô hiệu hoá → Unauthorized', async () => {
      usersService.findOneByUsername.mockResolvedValue({
        id: 31,
        username: 'ktv31',
        isActive: false,
      });

      await expect(service.findOrCreateLdapUser('ktv31')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('người dùng mới → tạo với mật khẩu ngẫu nhiên, email suy ra từ tên miền nội bộ', async () => {
      usersService.findOneByUsername
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 32,
          username: 'ktv32',
          isActive: true,
        });
      usersService.create.mockResolvedValue({ id: 32, username: 'ktv32' });

      const res = await service.findOrCreateLdapUser('ktv32');

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'ktv32',
          email: 'ktv32@lpbank.com.vn',
          isActive: true,
        }),
      );
      expect(usersService.create.mock.calls[0][0].password).toHaveLength(16);
      expect(res.id).toBe(32);
    });

    it('tên đăng nhập dạng email được giữ nguyên làm email', async () => {
      usersService.findOneByUsername
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 33, username: 'a@lpbank.com.vn', isActive: true });
      usersService.create.mockResolvedValue({ id: 33 });

      await service.findOrCreateLdapUser('a@lpbank.com.vn');

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'a@lpbank.com.vn' }),
      );
    });
  });

  // ===========================================================================
  // CẤU HÌNH CÔNG KHAI + TỰ ĐĂNG KÝ
  // ===========================================================================
  describe('getPublicAuthConfig()', () => {
    it('ẩn cấu hình Keycloak khi Keycloak chưa bật', async () => {
      keycloakService.getPublicConfig.mockReturnValue({ enabled: false });

      const cfg = await service.getPublicAuthConfig();

      expect(cfg.keycloakEnabled).toBe(false);
      expect(cfg.keycloak).toBeNull();
    });

    it('công bố cấu hình Keycloak khi được bật', async () => {
      keycloakService.getPublicConfig.mockReturnValue({
        enabled: true,
        url: 'https://sso.lpbank.vn',
        realm: 'lpbank',
      });

      const cfg = await service.getPublicAuthConfig();

      expect(cfg.keycloakEnabled).toBe(true);
      expect(cfg.keycloak).toEqual({
        enabled: true,
        url: 'https://sso.lpbank.vn',
        realm: 'lpbank',
      });
    });

    it('luôn trả về tên miền LDAP nội bộ và chế độ mặc định', async () => {
      keycloakService.getPublicConfig.mockReturnValue(null);

      const cfg = await service.getPublicAuthConfig();

      expect(cfg.ldapDomain).toBe('lpbank.com.vn');
      expect(cfg.defaultMode).toBe('ALL');
      expect(cfg.localEnabled).toBe(true);
    });
  });

  describe('register()', () => {
    const dto = {
      username: 'newuser',
      password: 'StrongPass123!@',
      fullName: 'Người Dùng Mới',
      email: 'new@bank.com',
    };

    it('ném Forbidden khi quản trị viên đã tắt tự đăng ký', async () => {
      securityConfig.getBoolean.mockImplementation((key: string, def: boolean) =>
        key === 'ALLOW_SELF_REGISTRATION' ? false : def,
      );

      await expect(service.register(dto)).rejects.toThrow(ForbiddenException);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('mật khẩu yếu → BadRequest, không tạo tài khoản', async () => {
      await expect(
        service.register({ ...dto, password: 'yeu' }),
      ).rejects.toThrow(BadRequestException);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('tên đăng nhập đã tồn tại → BadRequest', async () => {
      usersService.findOneByUsername.mockResolvedValue({ id: 1 });

      await expect(service.register(dto)).rejects.toThrow(
        'Tên đăng nhập đã tồn tại trong hệ thống.',
      );
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('tự đăng ký thành công → tạo tài khoản với vai trò mặc định và trả token', async () => {
      usersService.findOneByUsername
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 41,
          username: 'newuser',
          fullName: 'Người Dùng Mới',
          role: { name: 'Kiểm toán viên', permissions: 'read' },
          passwordChangedAt: new Date(),
        });

      const res = await service.register(dto);

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'newuser',
          role: 'Kiểm toán viên',
          isActive: true,
        }),
      );
      expect(res.access_token).toBe('mock-jwt-token');
    });

    it('bỏ trống họ tên → dùng tên đăng nhập làm họ tên', async () => {
      usersService.findOneByUsername
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 41,
          username: 'newuser',
          role: 'Kiểm toán viên',
          passwordChangedAt: new Date(),
        });

      await service.register({ ...dto, fullName: '' });

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ fullName: 'newuser' }),
      );
    });
  });
});
