import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { SecurityConfigService } from '../system-management/security-config.service';
import { PasswordChangeRequest } from './entities/password-change-request.entity';
import { UnauthorizedException } from '@nestjs/common';
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
});
