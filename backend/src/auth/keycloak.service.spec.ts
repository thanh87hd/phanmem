import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { KeycloakService } from './keycloak.service';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';
import { UnauthorizedException } from '@nestjs/common';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('KeycloakService', () => {
  let service: KeycloakService;

  const mockRoles = [
    { id: 1, name: 'Admin', permissions: 'all' },
    { id: 2, name: 'Trưởng đoàn kiểm toán', permissions: 'audit:manage' },
    { id: 3, name: 'Kiểm toán viên', permissions: 'audit:read,audit:write' },
  ];

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        KEYCLOAK_ENABLED: 'true',
        KEYCLOAK_BASE_URL: 'http://localhost:8080',
        KEYCLOAK_REALM: 'lpbank-audit',
        KEYCLOAK_CLIENT_ID: 'lpbank-audit-client',
        KEYCLOAK_CLIENT_SECRET: 'lpbank-audit-secret-2026',
        KEYCLOAK_REDIRECT_URI:
          'http://localhost:3000/api/auth/sso/keycloak/callback',
      };
      return config[key] !== undefined ? config[key] : defaultValue;
    }),
  };

  const mockUsersService = {
    findOneByUsername: jest.fn(),
    create: jest.fn(),
  };

  const mockRolesService = {
    findAll: jest.fn().mockResolvedValue(mockRoles),
    findByName: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeycloakService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: RolesService, useValue: mockRolesService },
      ],
    }).compile();

    service = module.get<KeycloakService>(KeycloakService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isEnabled & getPublicConfig', () => {
    it('should report enabled based on configuration', () => {
      expect(service.isEnabled()).toBe(true);
      const config = service.getPublicConfig();
      expect(config.enabled).toBe(true);
      expect(config.realm).toBe('lpbank-audit');
      expect(config.clientId).toBe('lpbank-audit-client');
      expect(config.loginUrl).toContain('openid-connect/auth');
    });
  });

  describe('getAuthorizationUrl', () => {
    it('should construct valid OIDC authorization URL with required parameters', () => {
      const url = service.getAuthorizationUrl('test-state-123');
      expect(url).toContain(
        'http://localhost:8080/realms/lpbank-audit/protocol/openid-connect/auth',
      );
      expect(url).toContain('client_id=lpbank-audit-client');
      expect(url).toContain('response_type=code');
      expect(url).toContain('state=test-state-123');
      expect(url).toContain('scope=openid+profile+email+roles');
    });
  });

  describe('resolveSystemRole', () => {
    it('should map admin keycloak role to Admin system role', async () => {
      const role = await service.resolveSystemRole(['default-roles', 'admin']);
      expect(role).toBeDefined();
      expect(role.name).toBe('Admin');
    });

    it('should map lead_auditor keycloak role to Trưởng đoàn kiểm toán', async () => {
      const role = await service.resolveSystemRole(['lead_auditor']);
      expect(role).toBeDefined();
      expect(role.name).toBe('Trưởng đoàn kiểm toán');
    });

    it('should fallback to Kiểm toán viên if role is unmapped', async () => {
      const role = await service.resolveSystemRole(['unknown_role']);
      expect(role).toBeDefined();
      expect(role.name).toBe('Kiểm toán viên');
    });
  });

  describe('findOrCreateUser', () => {
    it('should return existing user if username exists and active', async () => {
      const existingUser = {
        id: 10,
        username: 'auditor.test',
        fullName: 'Nguyễn Văn A',
        isActive: true,
        role: { name: 'Kiểm toán viên' },
      };
      mockUsersService.findOneByUsername.mockResolvedValueOnce(existingUser);

      const result = await service.findOrCreateUser({
        sub: 'sub-123',
        username: 'auditor.test',
        email: 'auditor.test@lpbank.com.vn',
        fullName: 'Nguyễn Văn A',
        roles: ['auditor'],
      });

      expect(result).toEqual(existingUser);
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if existing user is deactivated', async () => {
      mockUsersService.findOneByUsername.mockResolvedValueOnce({
        id: 10,
        username: 'deactivated.user',
        isActive: false,
      });

      await expect(
        service.findOrCreateUser({
          sub: 'sub-456',
          username: 'deactivated.user',
          email: 'deactivated@lpbank.com.vn',
          fullName: 'Deactivated User',
          roles: ['auditor'],
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should JIT provision new user if user does not exist', async () => {
      mockUsersService.findOneByUsername
        .mockResolvedValueOnce(null) // first check by username
        .mockResolvedValueOnce(null) // check by email
        .mockResolvedValueOnce({
          id: 99,
          username: 'new.sso.user',
          fullName: 'New SSO User',
          role: { name: 'Kiểm toán viên' },
          isActive: true,
        }); // re-fetch after creation

      mockUsersService.create.mockResolvedValueOnce({ id: 99 });

      const result = await service.findOrCreateUser({
        sub: 'sub-789',
        username: 'new.sso.user',
        email: 'new.sso@lpbank.com.vn',
        fullName: 'New SSO User',
        roles: ['auditor'],
        department: 'Phòng KTNB Miền Bắc',
      });

      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'new.sso.user',
          email: 'new.sso@lpbank.com.vn',
          fullName: 'New SSO User',
          department: 'Phòng KTNB Miền Bắc',
          isActive: true,
        }),
      );
      expect(result.username).toBe('new.sso.user');
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should post authorization code to Keycloak token endpoint', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'mock-access-token',
          id_token: 'mock-id-token',
          refresh_token: 'mock-refresh-token',
        },
      });

      const tokens = await service.exchangeCodeForTokens('auth-code-123');
      expect(tokens.access_token).toBe('mock-access-token');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8080/realms/lpbank-audit/protocol/openid-connect/token',
        expect.stringContaining('code=auth-code-123'),
        expect.any(Object),
      );
    });

    it('should throw UnauthorizedException when token exchange fails', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: { data: { error_description: 'Code invalid or expired' } },
      });

      await expect(
        service.exchangeCodeForTokens('invalid-code'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('testConnection', () => {
    it('should return success when discovery endpoint responds', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { issuer: 'http://localhost:8080/realms/lpbank-audit' },
      });

      const res = await service.testConnection();
      expect(res.success).toBe(true);
      expect(res.issuer).toBe('http://localhost:8080/realms/lpbank-audit');
    });

    it('should return failure when server is unreachable', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const res = await service.testConnection();
      expect(res.success).toBe(false);
      expect(res.message).toContain('ECONNREFUSED');
    });
  });
});
