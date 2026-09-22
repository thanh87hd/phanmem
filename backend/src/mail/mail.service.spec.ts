import { Test, TestingModule } from '@nestjs/testing';
import { MailService, SendMailDto } from './mail.service';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import axios from 'axios';

jest.mock('nodemailer');
jest.mock('axios');
jest.mock('@azure/msal-node', () => {
  return {
    ConfidentialClientApplication: jest.fn().mockImplementation(() => ({
      acquireTokenByClientCredential: jest
        .fn()
        .mockResolvedValue({ accessToken: 'mock-access-token' }),
    })),
  };
});

describe('MailService', () => {
  let service: MailService;

  const mockTransporter = {
    sendMail: jest.fn().mockResolvedValue({ messageId: 'msg-1' }),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
  });

  describe('with SMTP configured', () => {
    beforeEach(async () => {
      mockConfigService.get.mockImplementation((key: string, defVal: any) => {
        if (key === 'SMTP_HOST') return 'smtp.lpbank.com.vn';
        if (key === 'SMTP_PORT') return '587';
        if (key === 'SMTP_USER') return 'ktnb@lpbank.com.vn';
        if (key === 'SMTP_PASS') return 'secret';
        if (key === 'SMTP_FROM') return 'ktnb@lpbank.com.vn';
        return defVal;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MailService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<MailService>(MailService);
    });

    it('should send email via SMTP successfully', async () => {
      const dto: SendMailDto = {
        to: 'auditor@lpbank.com.vn',
        subject: 'Thông báo kiểm toán',
        html: '<p>Nội dung</p>',
      };

      const result = await service.sendMail(dto);
      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });

    it('should handle SMTP error and return false', async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(
        new Error('SMTP connection error'),
      );

      const result = await service.sendMail({
        to: 'test@lpbank.com.vn',
        subject: 'Test',
        html: '<p>Test</p>',
      });
      expect(result).toBe(false);
    });

    it('should send overdue warning', async () => {
      const result = await service.sendOverdueWarning(
        'lead@lpbank.com.vn',
        'KN-01 Thiếu chứng từ',
        '2026-12-31',
        'Chi nhánh Hà Nội',
      );
      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Cảnh báo: Kiến nghị'),
        }),
      );
    });

    it('should send report issued notice', async () => {
      const result = await service.sendReportIssued(
        'bks@lpbank.com.vn',
        'Báo cáo kiểm toán Quý 1',
        'Trưởng đoàn Tuấn',
      );
      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Báo cáo Kiểm toán đã phát hành'),
        }),
      );
    });
  });

  describe('with no mail provider configured', () => {
    beforeEach(async () => {
      mockConfigService.get.mockReturnValue(undefined);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MailService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<MailService>(MailService);
    });

    it('should return false when no mail provider configured', async () => {
      const result = await service.sendMail({
        to: 'user@test.com',
        subject: 'Sub',
        html: '<p>Body</p>',
      });
      expect(result).toBe(false);
    });
  });

  describe('with MS Graph configured', () => {
    beforeEach(async () => {
      mockConfigService.get.mockImplementation((key: string, defVal: any) => {
        if (key === 'O365_TENANT_ID') return 'tenant-id-123';
        if (key === 'O365_CLIENT_ID') return 'client-id-123';
        if (key === 'O365_CLIENT_SECRET') return 'client-secret-123';
        if (key === 'O365_SENDER_EMAIL') return 'audit-noreply@lpbank.com.vn';
        return defVal;
      });

      (axios.post as jest.Mock).mockResolvedValue({ status: 202 });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MailService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<MailService>(MailService);
    });

    it('should send email via MS Graph', async () => {
      const result = await service.sendMail({
        to: ['auditor1@lpbank.com.vn', 'auditor2@lpbank.com.vn'],
        subject: 'Graph Mail Test',
        html: '<p>Graph Body</p>',
      });

      expect(result).toBe(true);
      expect(axios.post).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/users/audit-noreply@lpbank.com.vn/sendMail',
        expect.any(Object),
        expect.any(Object),
      );
    });
  });
});
