import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { ConfidentialClientApplication } from '@azure/msal-node';
import axios from 'axios';

export interface SendMailDto {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private msalClient: ConfidentialClientApplication | null = null;

  constructor(private configService: ConfigService) {
    // Legacy SMTP Setup
    const host = this.configService.get('SMTP_HOST');
    const port = this.configService.get('SMTP_PORT');
    const user = this.configService.get('SMTP_USER');
    const pass = this.configService.get('SMTP_PASS');

    if (host && port) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: Number(port) === 465,
        auth: user ? { user, pass } : undefined,
      });
    }

    // Exchange 365 MSAL Setup
    const tenantId = this.configService.get('O365_TENANT_ID');
    const clientId = this.configService.get('O365_CLIENT_ID');
    const clientSecret = this.configService.get('O365_CLIENT_SECRET');

    if (tenantId && clientId && clientSecret) {
      this.msalClient = new ConfidentialClientApplication({
        auth: {
          clientId,
          authority: `https://login.microsoftonline.com/${tenantId}`,
          clientSecret,
        },
      });
      this.logger.log('Microsoft 365 Exchange Integration initialized.');
    }
  }

  async sendMail(dto: SendMailDto): Promise<boolean> {
    const sender = this.configService.get('O365_SENDER_EMAIL');
    if (this.msalClient && sender) {
      return this.sendMailViaGraph(sender, dto);
    }

    if (!this.transporter) {
      this.logger.warn(
        'No mail provider configured (SMTP or MS Graph). Email not sent.',
      );
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM', 'ktnb@nganhang.vn'),
        to: Array.isArray(dto.to) ? dto.to.join(', ') : dto.to,
        subject: dto.subject,
        html: dto.html,
        text: dto.text,
      });
      return true;
    } catch (error) {
      this.logger.error('Error sending email via SMTP:', error);
      return false;
    }
  }

  private async sendMailViaGraph(
    sender: string,
    dto: SendMailDto,
  ): Promise<boolean> {
    try {
      if (!this.msalClient) return false;
      const authResponse = await this.msalClient.acquireTokenByClientCredential(
        {
          scopes: ['https://graph.microsoft.com/.default'],
        },
      );

      if (!authResponse?.accessToken) {
        throw new Error('Failed to acquire token from MSAL');
      }

      const toRecipients = Array.isArray(dto.to) ? dto.to : [dto.to];
      const message = {
        message: {
          subject: dto.subject,
          body: {
            contentType: 'HTML',
            content: dto.html,
          },
          toRecipients: toRecipients.map((email) => ({
            emailAddress: { address: email },
          })),
        },
        saveToSentItems: 'false',
      };

      await axios.post(
        `https://graph.microsoft.com/v1.0/users/${sender}/sendMail`,
        message,
        {
          headers: {
            Authorization: `Bearer ${authResponse.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Email sent via MS Graph to ${toRecipients.join(', ')}`);
      return true;
    } catch (error) {
      this.logger.error('Error sending email via MS Graph:', error);
      return false;
    }
  }

  /** Gửi cảnh báo kiến nghị sắp quá hạn */
  async sendOverdueWarning(
    to: string,
    recTitle: string,
    dueDate: string,
    legacyDepartment: string,
  ) {
    return this.sendMail({
      to,
      subject: `[KTNB] Cảnh báo: Kiến nghị sắp đến hạn - ${legacyDepartment}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #cf1322;">⚠️ Cảnh báo Kiến nghị sắp đến hạn</h2>
          <table style="border-collapse: collapse; width: 100%;">
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Kiến nghị:</td><td style="padding: 8px; border: 1px solid #ddd;">${recTitle}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Đơn vị:</td><td style="padding: 8px; border: 1px solid #ddd;">${legacyDepartment}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Hạn chót:</td><td style="padding: 8px; border: 1px solid #ddd; color: #cf1322; font-weight: bold;">${dueDate}</td></tr>
          </table>
          <p style="margin-top: 16px;">Vui lòng cập nhật tiến độ khắc phục trên hệ thống KTNB.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">Email tự động từ Hệ thống Quản lý Kiểm toán Nội bộ</p>
        </div>
      `,
    });
  }

  /** Gửi thông báo báo cáo mới phát hành */
  async sendReportIssued(to: string, reportTitle: string, issuedBy: string) {
    return this.sendMail({
      to,
      subject: `[KTNB] Báo cáo Kiểm toán đã phát hành: ${reportTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #52c41a;">✅ Báo cáo Kiểm toán đã được phát hành</h2>
          <p><strong>Tên báo cáo:</strong> ${reportTitle}</p>
          <p><strong>Người phát hành:</strong> ${issuedBy}</p>
          <p>Vui lòng đăng nhập hệ thống để xem chi tiết.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">Email tự động từ Hệ thống Quản lý Kiểm toán Nội bộ</p>
        </div>
      `,
    });
  }
}
