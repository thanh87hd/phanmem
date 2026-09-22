import { Test, TestingModule } from '@nestjs/testing';
import { LdapService } from './ldap.service';
import { ConfigService } from '@nestjs/config';
import * as ldap from 'ldapjs';

jest.mock('ldapjs');

describe('LdapService', () => {
  let service: LdapService;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key, defaultVal) => defaultVal),
  };

  const mockClient = {
    on: jest.fn(),
    bind: jest.fn(),
    unbind: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    (ldap.createClient as jest.Mock).mockReturnValue(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LdapService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<LdapService>(LdapService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('authenticate', () => {
    it('should return true on successful LDAP bind', async () => {
      mockClient.bind.mockImplementation((upn, pwd, cb) => {
        cb(null);
      });

      const result = await service.authenticate('nguyenvana', 'pass123');
      expect(result).toBe(true);
      expect(mockClient.unbind).toHaveBeenCalled();
    });

    it('should return false on LDAP bind error', async () => {
      mockClient.bind.mockImplementation((upn, pwd, cb) => {
        cb(new Error('Invalid Credentials'));
      });

      const result = await service.authenticate('wronguser', 'wrongpass');
      expect(result).toBe(false);
      expect(mockClient.unbind).toHaveBeenCalled();
    });

    it('should handle client error and return false', async () => {
      mockClient.on.mockImplementation((event, handler) => {
        if (event === 'error') {
          handler(new Error('Connection refused'));
        }
      });
      mockClient.bind.mockImplementation(() => {});

      const result = await service.authenticate('user', 'pass');
      expect(result).toBe(false);
    });
  });

  describe('syncUsers', () => {
    it('should return sync result', async () => {
      const result = await service.syncUsers();
      expect(result).toEqual({ success: true, synced: 0 });
    });
  });
});
