import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationService, SmtpConfig } from './integration.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SsoProvider } from './entities/sso-provider.entity';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';

jest.mock('nodemailer');
jest.mock('fs');

describe('IntegrationService', () => {
  let service: IntegrationService;

  const mockSsoRepo = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    findOneOrFail: jest.fn(),
  };

  const mockTransporter = {
    verify: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-msg-id' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationService,
        { provide: getRepositoryToken(SsoProvider), useValue: mockSsoRepo },
      ],
    }).compile();

    service = module.get<IntegrationService>(IntegrationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('SMTP Config Management', () => {
    it('should get SMTP config when file exists', () => {
      const config: SmtpConfig = {
        host: 'smtp.lpbank.com.vn',
        port: 587,
        secure: false,
        authType: 'basic',
        user: 'ktnb@lpbank.com.vn',
        password: 'password',
        domain: '',
        tenantId: '',
        clientId: '',
        clientSecret: '',
        fromName: 'KTNB LPBank',
        fromEmail: 'ktnb@lpbank.com.vn',
        enabled: true,
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(config));

      const result = service.getSmtpConfig();
      expect(result?.host).toBe('smtp.lpbank.com.vn');
    });

    it('should return null when SMTP config file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      expect(service.getSmtpConfig()).toBeNull();
    });

    it('should save SMTP config to file', () => {
      const config: SmtpConfig = {
        host: 'smtp.lpbank.com.vn',
        port: 465,
        secure: true,
        authType: 'basic',
        user: 'user',
        password: 'pass',
        domain: '',
        tenantId: '',
        clientId: '',
        clientSecret: '',
        fromName: 'KTNB',
        fromEmail: 'ktnb@lpbank.com.vn',
        enabled: true,
      };

      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
      const saved = service.saveSmtpConfig(config);
      expect(saved.host).toBe('smtp.lpbank.com.vn');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('testSmtpConfig', () => {
    it('should test Basic SMTP config successfully', async () => {
      const config: SmtpConfig = {
        host: 'smtp.lpbank.com.vn',
        port: 587,
        secure: false,
        authType: 'basic',
        user: 'ktnb@lpbank.com.vn',
        password: 'password',
        domain: '',
        tenantId: '',
        clientId: '',
        clientSecret: '',
        fromName: 'KTNB LPBank',
        fromEmail: 'ktnb@lpbank.com.vn',
        enabled: true,
      };

      const result = await service.testSmtpConfig(config);
      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });

    it('should handle SMTP connection error gracefully', async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(
        new Error('Connection timed out'),
      );

      const config: SmtpConfig = {
        host: 'smtp.invalid.com',
        port: 25,
        secure: false,
        authType: 'anonymous',
        user: '',
        password: '',
        domain: '',
        tenantId: '',
        clientId: '',
        clientSecret: '',
        fromName: 'KTNB',
        fromEmail: 'ktnb@lpbank.com.vn',
        enabled: true,
      };

      const result = await service.testSmtpConfig(config);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection timed out');
    });
  });

  describe('SSO Providers Management', () => {
    it('should findAllSsoProviders and mask passwords', async () => {
      mockSsoRepo.find.mockResolvedValue([
        { id: 1, name: 'Active Directory', bindPassword: 'secretpassword' },
      ]);

      const providers = await service.findAllSsoProviders();
      expect(providers[0].bindPassword).toBe('••••••••');
    });

    it('should createSsoProvider', async () => {
      const dto = { name: 'AD LPBank', host: 'ad.lpbank.com.vn' };
      const result = await service.createSsoProvider(dto);
      expect(result).toBeDefined();
      expect(mockSsoRepo.create).toHaveBeenCalledWith(dto);
      expect(mockSsoRepo.save).toHaveBeenCalled();
    });

    it('should updateSsoProvider and not overwrite with masked password', async () => {
      mockSsoRepo.findOneOrFail.mockResolvedValue({ id: 1, name: 'AD New' });

      const result = await service.updateSsoProvider(1, {
        name: 'AD New',
        bindPassword: '••••••••',
      });

      expect(mockSsoRepo.update).toHaveBeenCalledWith(1, { name: 'AD New' });
      expect(result.name).toBe('AD New');
    });

    it('should deleteSsoProvider', async () => {
      await service.deleteSsoProvider(1);
      expect(mockSsoRepo.delete).toHaveBeenCalledWith(1);
    });
  });
});
