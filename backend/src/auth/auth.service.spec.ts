import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { SecurityConfigService } from '../system-management/security-config.service';
import { PasswordChangeRequest } from './entities/password-change-request.entity';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findOne: jest.fn(),
    findOneByUsername: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn(),
  };

  const mockPasswordChangeRequestRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    save: jest
      .fn()
      .mockImplementation((req) => Promise.resolve({ id: 1, ...req })),
    create: jest.fn().mockImplementation((dto) => dto),
  };

  const mockSecurityConfig = {
    getNumber: jest.fn((key, def) => {
      if (key === 'PASSWORD_MIN_LENGTH') return 12;
      if (key === 'MAX_FAILED_ATTEMPTS') return 5;
      if (key === 'LOCKOUT_MINUTES') return 30;
      if (key === 'PASSWORD_EXPIRY_DAYS') return 90;
      return def;
    }),
    getBoolean: jest.fn((key, def) => {
      if (key === 'PASSWORD_COMPLEXITY') return true;
      return def;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: getRepositoryToken(PasswordChangeRequest),
          useValue: mockPasswordChangeRequestRepo,
        },
        {
          provide: SecurityConfigService,
          useValue: mockSecurityConfig,
        },
        {
          provide: 'CACHE_MANAGER',
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            del: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validatePasswordComplexity', () => {
    it('should reject passwords shorter than min length', () => {
      const result = service.validatePasswordComplexity('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Mật khẩu phải có ít nhất 12 ký tự');
    });

    it('should reject passwords missing uppercase letters', () => {
      const result = service.validatePasswordComplexity('lowercase_only_123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Phải chứa ít nhất 1 chữ cái IN HOA (A-Z)',
      );
    });

    it('should reject passwords missing numbers', () => {
      const result = service.validatePasswordComplexity('NoNumberPassWord!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Phải chứa ít nhất 1 chữ số (0-9)');
    });

    it('should reject passwords missing special characters', () => {
      const result = service.validatePasswordComplexity('NoSpecialChar1234');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Phải chứa ít nhất 1 ký tự đặc biệt (!@#$%^&*...)',
      );
    });

    it('should approve valid strong passwords', () => {
      const result = service.validatePasswordComplexity('StrongP@ssw0rd2026!');
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('validateUser', () => {
    it('should return null if user not found', async () => {
      mockUsersService.findOneByUsername.mockResolvedValue(null);
      const result = await service.validateUser('unknown', 'secret');
      expect(result).toBeNull();
    });

    it('should throw UnauthorizedException if user is deactivated', async () => {
      mockUsersService.findOneByUsername.mockResolvedValue({
        id: 1,
        username: 'inactive_user',
        isActive: false,
      });

      await expect(
        service.validateUser('inactive_user', 'secret'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user account is locked', async () => {
      const futureLock = new Date(Date.now() + 600000); // 10 mins in future
      mockUsersService.findOneByUsername.mockResolvedValue({
        id: 1,
        username: 'locked_user',
        isActive: true,
        lockedUntil: futureLock,
      });

      await expect(
        service.validateUser('locked_user', 'secret'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should validate correctly and return user without sensitive password hash', async () => {
      const passwordHash = bcrypt.hashSync('ValidPass123!', 10);
      mockUsersService.findOneByUsername.mockResolvedValue({
        id: 1,
        username: 'auditor1',
        fullName: 'Nguyen Van A',
        role: 'KTV',
        isActive: true,
        passwordHash,
        passwordHistory: '[]',
      });

      const result = await service.validateUser('auditor1', 'ValidPass123!');
      expect(result).toBeDefined();
      expect(result.username).toBe('auditor1');
      expect(result.passwordHash).toBeUndefined();
      expect(mockUsersService.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ failedLoginAttempts: 0, lockedUntil: null }),
      );
    });
  });

  describe('login', () => {
    it('should issue full access token when 2FA is disabled', async () => {
      const user = {
        id: 1,
        username: 'admin',
        fullName: 'Admin User',
        role: { name: 'Admin', permissions: 'ALL' },
        twoFactorEnabled: false,
      };

      const res = await service.login(user);
      if ('access_token' in res) {
        expect(res.access_token).toBe('mock-jwt-token');
        expect(res.user.username).toBe('admin');
        expect(res.user.role).toBe('Admin');
      } else {
        throw new Error('Expected access_token in login result');
      }
    });

    it('should issue temporary token when 2FA is enabled', async () => {
      const user = {
        id: 2,
        username: 'lead_auditor',
        twoFactorEnabled: true,
      };

      const res = await service.login(user);
      if ('require2FA' in res) {
        expect(res.require2FA).toBe(true);
        expect(res.tempToken).toBe('mock-jwt-token');
      } else {
        throw new Error('Expected require2FA in login result');
      }
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 2, require2FA: true }),
        expect.objectContaining({ expiresIn: '5m' }),
      );
    });
  });

  // ==================== UAT TC-AUTH-01 ====================

  describe('TC-AUTH-01: Đăng nhập & bắt buộc đổi mật khẩu', () => {
    it('TC-AUTH-01: trả mustChangePassword = true cho tài khoản mới được đánh cờ', async () => {
      const user = {
        id: 7,
        username: 'datnc3',
        fullName: 'Nguyễn Cảnh Đạt',
        role: { name: 'KTV', permissions: 'AUDIT_VIEW' },
        twoFactorEnabled: false,
        mustChangePassword: true,
        passwordChangedAt: new Date(),
      };

      const res: any = await service.login(user);

      expect(res.access_token).toBe('mock-jwt-token');
      // UI bắt buộc mở modal đổi mật khẩu => cờ phải đi kèm response đăng nhập
      expect(res.user.mustChangePassword).toBe(true);
      expect(res.user.username).toBe('datnc3');
      expect(res.user.role).toBe('KTV');
      // Mật khẩu vừa được đổi hôm nay => không bị coi là hết hạn
      expect(res.user.isPasswordExpired).toBe(false);
    });

    it('TC-AUTH-01: không gắn cờ mustChangePassword cho tài khoản bình thường', async () => {
      const user = {
        id: 8,
        username: 'thiendh',
        fullName: 'Nguyễn Xuân Thiện',
        role: { name: 'KTV', permissions: 'AUDIT_VIEW' },
        twoFactorEnabled: false,
        // mustChangePassword không được set trong CSDL
      };

      const res: any = await service.login(user);

      expect(res.user.mustChangePassword).toBe(false);
      expect(res.access_token).toBe('mock-jwt-token');
    });
  });

  // ==================== UAT TC-AUTH-02 ====================

  describe('TC-AUTH-02: Xác nhận đổi mật khẩu hợp lệ (PCI DSS)', () => {
    const CURRENT_PASSWORD = '@Lpbank2026!';
    const NEW_PASSWORD = '@Bcd12345678';

    beforeEach(() => {
      mockUsersService.findOne.mockReset();
      mockUsersService.update.mockReset();
      mockUsersService.update.mockResolvedValue({ affected: 1 });
    });

    it('TC-AUTH-02: từ chối khi mật khẩu hiện tại không đúng và không ghi gì vào CSDL', async () => {
      const user: any = {
        id: 7,
        username: 'datnc3',
        passwordHash: bcrypt.hashSync(CURRENT_PASSWORD, 10),
        passwordHistory: '[]',
        mustChangePassword: true,
      };
      mockUsersService.findOne.mockResolvedValue(user);

      const err = await service
        .changePassword(7, 'SaiMatKhau@2026', NEW_PASSWORD)
        .catch((e) => e);

      expect(err).toBeInstanceOf(UnauthorizedException);
      expect(err.getStatus()).toBe(401);
      expect(err.message).toBe('Mật khẩu hiện tại không đúng');
      expect(mockUsersService.update).not.toHaveBeenCalled();
    });

    it('TC-AUTH-02: từ chối mật khẩu mới không đạt độ phức tạp và không ghi gì vào CSDL', async () => {
      const user: any = {
        id: 7,
        username: 'datnc3',
        passwordHash: bcrypt.hashSync(CURRENT_PASSWORD, 10),
        passwordHistory: '[]',
      };
      mockUsersService.findOne.mockResolvedValue(user);

      const err = await service
        .changePassword(7, CURRENT_PASSWORD, '123456')
        .catch((e) => e);

      expect(err).toBeInstanceOf(ForbiddenException);
      expect(err.getStatus()).toBe(403);
      expect(err.message).toContain('Mật khẩu không đạt tiêu chuẩn bảo mật');
      expect(err.message).toContain('Mật khẩu phải có ít nhất 12 ký tự');
      expect(mockUsersService.update).not.toHaveBeenCalled();
    });

    it('TC-AUTH-02: từ chối mật khẩu đã dùng trong lịch sử (PASSWORD_HISTORY_COUNT)', async () => {
      const user: any = {
        id: 7,
        username: 'datnc3',
        passwordHash: bcrypt.hashSync(CURRENT_PASSWORD, 10),
        passwordHistory: JSON.stringify([bcrypt.hashSync(NEW_PASSWORD, 10)]),
      };
      mockUsersService.findOne.mockResolvedValue(user);

      const err = await service
        .changePassword(7, CURRENT_PASSWORD, NEW_PASSWORD)
        .catch((e) => e);

      expect(err).toBeInstanceOf(ForbiddenException);
      expect(err.getStatus()).toBe(403);
      expect(err.message).toBe(
        'Không được sử dụng lại 4 mật khẩu gần nhất. Vui lòng chọn mật khẩu khác.',
      );
      // Mật khẩu bị trùng => không đẩy lịch sử, không đổi mật khẩu
      expect(mockUsersService.update).not.toHaveBeenCalled();
    });

    it('TC-AUTH-02: từ chối khi mật khẩu mới TRÙNG mật khẩu hiện tại (PCI DSS 8.3.7) và không ghi gì vào CSDL', async () => {
      const user: any = {
        id: 7,
        username: 'datnc3',
        passwordHash: bcrypt.hashSync(CURRENT_PASSWORD, 10),
        passwordHistory: '[]',
      };
      mockUsersService.findOne.mockResolvedValue(user);

      const err = await service
        .changePassword(7, CURRENT_PASSWORD, CURRENT_PASSWORD)
        .catch((e) => e);

      expect(err).toBeInstanceOf(ForbiddenException);
      expect(err.getStatus()).toBe(403);
      expect(err.message).toBe(
        'Mật khẩu mới không được trùng với mật khẩu hiện tại. Vui lòng chọn mật khẩu khác.',
      );
      // Không đẩy mật khẩu cũ vào lịch sử, không ghi mật khẩu mới
      expect(mockUsersService.update).not.toHaveBeenCalled();
    });

    it('TC-AUTH-02: mật khẩu mới chỉ khác hoa/thường so với hiện tại vẫn được chấp nhận (không so chuỗi thô)', async () => {
      const user: any = {
        id: 7,
        username: 'datnc3',
        passwordHash: bcrypt.hashSync(CURRENT_PASSWORD, 10),
        passwordHistory: '[]',
      };
      mockUsersService.findOne.mockResolvedValue(user);

      await service.changePassword(7, CURRENT_PASSWORD, '@lPbank2026!');

      expect(mockUsersService.update).toHaveBeenNthCalledWith(2, 7, {
        password: '@lPbank2026!',
        mustChangePassword: false,
        passwordChangedAt: expect.any(Date),
      });
    });

    it('TC-AUTH-02: đổi mật khẩu hợp lệ -> lưu mustChangePassword=false, passwordChangedAt và đẩy mật khẩu cũ vào lịch sử', async () => {
      const user: any = {
        id: 7,
        username: 'datnc3',
        passwordHash: bcrypt.hashSync(CURRENT_PASSWORD, 10),
        passwordHistory: '[]',
        mustChangePassword: true,
      };
      mockUsersService.findOne.mockResolvedValue(user);
      const before = Date.now();

      await service.changePassword(7, CURRENT_PASSWORD, NEW_PASSWORD);

      // 1) Mật khẩu CŨ được đẩy vào lịch sử dưới dạng hash (không phải plaintext)
      expect(mockUsersService.update).toHaveBeenNthCalledWith(1, 7, {
        passwordHistory: JSON.stringify([user.passwordHash]),
      });

      // 2) Payload ghi thật sự: mật khẩu mới + cờ + mốc thời gian đổi
      expect(mockUsersService.update).toHaveBeenNthCalledWith(2, 7, {
        password: NEW_PASSWORD,
        mustChangePassword: false,
        passwordChangedAt: expect.any(Date),
      });

      const payload = mockUsersService.update.mock.calls[1][1];
      expect(payload.mustChangePassword).toBe(false);
      expect(payload.passwordChangedAt).toBeInstanceOf(Date);
      expect(payload.passwordChangedAt.getTime()).toBeGreaterThanOrEqual(
        before,
      );
      expect(payload.passwordChangedAt.getTime()).toBeLessThanOrEqual(
        Date.now(),
      );
      expect(mockUsersService.update).toHaveBeenCalledTimes(2);
    });

    it(
      'TC-AUTH-02: lịch sử mật khẩu chỉ giữ 4 hash gần nhất (PASSWORD_HISTORY_COUNT)',
      async () => {
        const oldHashes = [1, 2, 3, 4].map((i) =>
          bcrypt.hashSync(`OldP@ssw0rd202${i}!`, 10),
        );
        const user: any = {
          id: 7,
          username: 'datnc3',
          passwordHash: bcrypt.hashSync(CURRENT_PASSWORD, 10),
          passwordHistory: JSON.stringify(oldHashes),
        };
        mockUsersService.findOne.mockResolvedValue(user);

        await service.changePassword(7, CURRENT_PASSWORD, NEW_PASSWORD);

        const history = JSON.parse(
          mockUsersService.update.mock.calls[0][1].passwordHistory,
        );
        expect(history).toHaveLength(4);
        expect(history[0]).toBe(user.passwordHash);
        expect(history.slice(1)).toEqual(oldHashes.slice(0, 3));
      },
      15000,
    );
  });

  // ==================== UAT TC-AUTH-05 ====================

  describe('TC-AUTH-05: Khóa tài khoản khi nhập sai 5 lần', () => {
    const CORRECT_PASSWORD = '@Lpbank2026!';
    const WRONG_PASSWORD = '111111111';
    let storedUser: any;

    // Giả lập CSDL: update() ghi thẳng vào bản ghi mà findOneByUsername trả về
    const seedUser = (overrides: any = {}) => {
      storedUser = {
        id: 5,
        username: 'maict',
        fullName: 'Nguyễn Cảnh Đạt',
        isActive: true,
        passwordHash: bcrypt.hashSync(CORRECT_PASSWORD, 10),
        passwordHistory: '[]',
        failedLoginAttempts: 0,
        lockedUntil: null,
        ...overrides,
      };
      mockUsersService.findOneByUsername.mockResolvedValue(storedUser);
      mockUsersService.update.mockImplementation(async (id, patch) => {
        Object.assign(storedUser, patch);
        return { affected: 1 };
      });
      return storedUser;
    };

    beforeEach(() => {
      mockUsersService.findOneByUsername.mockReset();
      mockUsersService.update.mockReset();
      mockUsersService.update.mockResolvedValue({ affected: 1 });
    });

    it('TC-AUTH-05: đếm và lưu số lần sai mỗi lần, cảnh báo số lần còn lại ở lần 3 và 4', async () => {
      seedUser();

      // Lần 1 & 2: chưa tới ngưỡng cảnh báo
      await expect(service.validateUser('maict', WRONG_PASSWORD)).resolves.toBeNull();
      expect(mockUsersService.update).toHaveBeenNthCalledWith(1, 5, {
        failedLoginAttempts: 1,
      });

      await expect(service.validateUser('maict', WRONG_PASSWORD)).resolves.toBeNull();
      expect(mockUsersService.update).toHaveBeenNthCalledWith(2, 5, {
        failedLoginAttempts: 2,
      });

      // Lần 3: cảnh báo còn 2 lần thử, bộ đếm vẫn được ghi
      const err3 = await service
        .validateUser('maict', WRONG_PASSWORD)
        .catch((e) => e);
      expect(err3).toBeInstanceOf(UnauthorizedException);
      expect(err3.message).toBe(
        'Mật khẩu không đúng. Còn 2 lần thử trước khi tài khoản bị khóa.',
      );
      expect(mockUsersService.update).toHaveBeenNthCalledWith(3, 5, {
        failedLoginAttempts: 3,
      });

      // Lần 4: cảnh báo còn 1 lần thử
      const err4 = await service
        .validateUser('maict', WRONG_PASSWORD)
        .catch((e) => e);
      expect(err4).toBeInstanceOf(UnauthorizedException);
      expect(err4.message).toBe(
        'Mật khẩu không đúng. Còn 1 lần thử trước khi tài khoản bị khóa.',
      );
      expect(mockUsersService.update).toHaveBeenNthCalledWith(4, 5, {
        failedLoginAttempts: 4,
      });
      expect(storedUser.failedLoginAttempts).toBe(4);
    });

    it('TC-AUTH-05: lần sai thứ 5 khóa tài khoản 30 phút và lưu lockedUntil ≈ now + 30 phút', async () => {
      seedUser({ failedLoginAttempts: 4 });
      const before = Date.now();

      const err = await service
        .validateUser('maict', WRONG_PASSWORD)
        .catch((e) => e);

      expect(err).toBeInstanceOf(UnauthorizedException);
      expect(err.message).toBe(
        'Tài khoản bị khóa 30 phút do đăng nhập sai 5 lần liên tiếp.',
      );

      expect(mockUsersService.update).toHaveBeenCalledTimes(1);
      const payload = mockUsersService.update.mock.calls[0][1];
      expect(payload.failedLoginAttempts).toBe(0);

      const lockedUntil: Date = payload.lockedUntil;
      expect(lockedUntil).toBeInstanceOf(Date);
      // Sai số 1 giây cho phép (tolerance window)
      expect(lockedUntil.getTime()).toBeGreaterThanOrEqual(
        before + 30 * 60 * 1000 - 1000,
      );
      expect(lockedUntil.getTime()).toBeLessThanOrEqual(
        Date.now() + 30 * 60 * 1000 + 1000,
      );
      // lockedUntil đã được ghi xuống CSDL
      expect(storedUser.lockedUntil).toEqual(lockedUntil);
    });

    it('TC-AUTH-05: lần đăng nhập kế tiếp trên tài khoản đang khóa bị từ chối kèm số phút còn lại', async () => {
      const lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      seedUser({ lockedUntil });

      // Nhập ĐÚNG mật khẩu vẫn bị chặn vì khóa được kiểm tra trước khi so mật khẩu
      const err = await service
        .validateUser('maict', CORRECT_PASSWORD)
        .catch((e) => e);

      expect(err).toBeInstanceOf(UnauthorizedException);
      expect(err.message).toBe(
        'Tài khoản bị khóa do đăng nhập sai nhiều lần. Thử lại sau 30 phút.',
      );
      expect(mockUsersService.update).not.toHaveBeenCalled();
    });

    it('TC-AUTH-05: đăng nhập thành công sau nhiều lần sai reset failedLoginAttempts = 0', async () => {
      seedUser({ failedLoginAttempts: 3 });

      const result = await service.validateUser(
        'maict',
        CORRECT_PASSWORD,
        '10.20.30.40',
      );

      expect(result.username).toBe('maict');
      expect(result.passwordHash).toBeUndefined();
      expect(result.passwordHistory).toBeUndefined();
      expect(mockUsersService.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: expect.any(Date),
          lastLoginIp: '10.20.30.40',
        }),
      );
      expect(mockUsersService.update).toHaveBeenCalledTimes(1);
    });
  });
});
