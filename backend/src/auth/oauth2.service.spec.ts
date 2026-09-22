import { Test, TestingModule } from '@nestjs/testing';
import { OAuth2Service } from './oauth2.service';
import { ConfigService } from '@nestjs/config';

describe('OAuth2Service', () => {
  let service: OAuth2Service;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuth2Service,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OAuth2Service>(OAuth2Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLoginUrl', () => {
    it('should generate login URL based on configuration', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SSO_OAUTH2_URL') return 'https://sso.lpbank.com.vn';
        if (key === 'SSO_CLIENT_ID') return 'client-123';
        if (key === 'SSO_REDIRECT_URI')
          return 'https://ams.lpbank.com.vn/auth/callback';
        return undefined;
      });

      const url = service.getLoginUrl();
      expect(url).toContain('https://sso.lpbank.com.vn/authorize');
      expect(url).toContain('client_id=client-123');
      expect(url).toContain(
        'redirect_uri=https://ams.lpbank.com.vn/auth/callback',
      );
    });
  });

  describe('handleCallback', () => {
    it('should return mock SSO user when SSO_OAUTH2_URL is not configured', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      const result = await service.handleCallback('code-123');
      expect(result.success).toBe(true);
      expect(result.email).toBe('sso_user@lpbank.com.vn');
      expect(result.roles).toContain('SSO_Verified');
    });

    it('should handle callback with configured SSO URL', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SSO_OAUTH2_URL') return 'https://sso.lpbank.com.vn';
        if (key === 'SSO_CLIENT_ID') return 'client-123';
        if (key === 'SSO_CLIENT_SECRET') return 'secret-xyz';
        return undefined;
      });

      const result = await service.handleCallback('auth-code-xyz');
      expect(result.success).toBe(true);
      expect(result.email).toBe('sso_user@lpbank.com.vn');
    });
  });
});
