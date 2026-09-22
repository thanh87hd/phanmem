import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SsoProvider } from './entities/sso-provider.entity';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

// ── Config file path ──────────────────────────────────────
const CONFIG_DIR = path.join(process.cwd(), 'config');
const SMTP_CONFIG_FILE = path.join(CONFIG_DIR, 'smtp.json');

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  // Phương thức xác thực: basic | oauth2 | anonymous | ntlm
  authType: 'basic' | 'oauth2' | 'anonymous' | 'ntlm';
  // Basic Auth / NTLM
  user: string;
  password: string;
  domain: string; // dùng cho NTLM
  // OAuth2 (Microsoft 365 / Exchange Online)
  tenantId: string;
  clientId: string;
  clientSecret: string;
  // Người gửi
  fromName: string;
  fromEmail: string;
  enabled: boolean;
}

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(
    @InjectRepository(SsoProvider)
    private readonly ssoRepo: Repository<SsoProvider>,
  ) {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
  }

  // ════════════════════════════════════════
  // SMTP CONFIG
  // ════════════════════════════════════════

  getSmtpConfig(): SmtpConfig | null {
    try {
      if (!fs.existsSync(SMTP_CONFIG_FILE)) return null;
      const raw = fs.readFileSync(SMTP_CONFIG_FILE, 'utf-8');
      return JSON.parse(raw) as SmtpConfig;
    } catch {
      return null;
    }
  }

  saveSmtpConfig(config: SmtpConfig): SmtpConfig {
    this.logger.log(
      `Saving SMTP config: host=${config.host}:${config.port}, authType=${config.authType}`,
    );
    fs.writeFileSync(
      SMTP_CONFIG_FILE,
      JSON.stringify(config, null, 2),
      'utf-8',
    );
    return config;
  }

  /**
   * Tạo nodemailer transporter tương ứng với authType
   */
  private async buildTransporter(
    config: SmtpConfig,
  ): Promise<nodemailer.Transporter> {
    const isProd = process.env.NODE_ENV === 'production';
    const baseOpts: any = {
      host: config.host,
      port: config.port,
      secure: config.secure,
      tls: { rejectUnauthorized: isProd }, // Enforce TLS validation in production (CS-TLS-001)
    };

    switch (config.authType) {
      // ─────── OAuth2 — Microsoft 365 / Exchange Online ───────
      case 'oauth2': {
        // Lấy access token từ Microsoft Identity Platform
        const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
        const body = new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          scope: 'https://graph.microsoft.com/.default', // Microsoft Graph scope
          grant_type: 'client_credentials',
        });

        const tokenRes = await fetch(tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });

        if (!tokenRes.ok) {
          const err = await tokenRes.json();
          throw new Error(
            `Microsoft OAuth2 lỗi: ${err.error} — ${err.error_description || 'Không lấy được access token'}`,
          );
        }

        const { access_token } = await tokenRes.json();
        this.logger.log(
          'OAuth2 access token acquired successfully from Microsoft',
        );

        return nodemailer.createTransport({
          ...baseOpts,
          auth: {
            type: 'OAuth2',
            user: config.user, // Email account sending the mail
            accessToken: access_token,
          },
        });
      }

      // ─────── NTLM — Exchange On-Premise ─────────────────────
      case 'ntlm': {
        // Nodemailer không hỗ trợ NTLM native tốt lắm, có thể thử gói mở rộng hoặc dùng Basic nếu Exchange cho phép NTLM fallback
        // Tạm thời cấu hình NTLM như một dạng basic với format domain\user hoặc user@domain
        return nodemailer.createTransport({
          ...baseOpts,
          auth: {
            user: config.domain
              ? `${config.domain}\\${config.user}`
              : config.user,
            pass: config.password,
          },
        });
      }

      // ─────── Anonymous Relay ─────────────────────────────────
      case 'anonymous': {
        return nodemailer.createTransport({
          ...baseOpts,
          // Không truyền đối tượng auth
        });
      }

      // ─────── Basic Auth (default) ────────────────────────────
      default: {
        return nodemailer.createTransport({
          ...baseOpts,
          auth: {
            user: config.user,
            pass: config.password,
          },
        });
      }
    }
  }

  async testSmtpConfig(
    config: SmtpConfig,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const transporter = await this.buildTransporter(config);

      // Với anonymous relay có thể không verify được do thiếu auth, nhưng thử gọi verify
      if (config.authType !== 'anonymous') {
        try {
          await transporter.verify();
        } catch (vErr: any) {
          this.logger.warn(
            `Verify failed, but will still try to send. Error: ${vErr.message}`,
          );
        }
      }

      const toAddr = config.user || config.fromEmail || 'test@lpbank.com.vn';
      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: toAddr,
        subject: '[KTNB AMS] Kiểm tra kết nối Email thành công',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; max-width: 520px;">
            <h2 style="color: #52c41a;">✅ Kết nối Email thành công!</h2>
            <p>Hệ thống KTNB AMS đã kết nối thành công với mail server:</p>
            <ul>
              <li><strong>Host:</strong> ${config.host}:${config.port}</li>
              <li><strong>Auth:</strong> ${config.authType?.toUpperCase() || 'BASIC'}</li>
              <li><strong>From:</strong> ${config.fromEmail}</li>
            </ul>
            <p>Thông báo tự động (kiến nghị sắp hạn, GTVL chờ duyệt, v.v.) sẽ được gửi qua địa chỉ này.</p>
            <hr style="border-color: #e0e0e0;" />
            <p style="font-size: 12px; color: #888;">Gửi lúc: ${new Date().toLocaleString('vi-VN')}</p>
          </div>
        `,
      });

      return {
        success: true,
        message: 'Kết nối và gửi email kiểm tra thành công!',
      };
    } catch (err: any) {
      this.logger.error('SMTP test failed:', err.message);
      return {
        success: false,
        message: err.message || 'Kết nối email thất bại',
      };
    }
  }

  // ════════════════════════════════════════
  // SSO PROVIDERS
  // ════════════════════════════════════════

  async findAllSsoProviders(): Promise<SsoProvider[]> {
    const providers = await this.ssoRepo.find({ order: { createdAt: 'ASC' } });
    // Mask mật khẩu khi trả về
    return providers.map((p) => ({
      ...p,
      bindPassword: p.bindPassword ? '••••••••' : '',
    }));
  }

  async createSsoProvider(data: Partial<SsoProvider>): Promise<SsoProvider> {
    const provider = this.ssoRepo.create(data);
    return this.ssoRepo.save(provider);
  }

  async updateSsoProvider(
    id: number,
    data: Partial<SsoProvider>,
  ): Promise<SsoProvider> {
    if (data.bindPassword === '••••••••') {
      delete data.bindPassword;
    }
    await this.ssoRepo.update(id, data);
    return this.ssoRepo.findOneOrFail({ where: { id } });
  }

  async deleteSsoProvider(id: number): Promise<void> {
    await this.ssoRepo.delete(id);
  }

  async testSsoConnection(
    id: number,
  ): Promise<{ success: boolean; message: string }> {
    const provider = await this.ssoRepo.findOneOrFail({ where: { id } });

    if (provider.type === 'keycloak') {
      const axios = require('axios');
      const baseUrl = (provider.host || 'http://localhost:8080').replace(
        /\/+$/,
        '',
      );
      const realm = provider.baseDn || 'lpbank-audit';
      const discoveryUrl = `${baseUrl}/realms/${realm}/.well-known/openid-configuration`;
      try {
        const response = await axios.get(discoveryUrl, { timeout: 5000 });
        if (response.status === 200) {
          await this.ssoRepo.update(id, { status: 'connected' });
          return {
            success: true,
            message: `Kết nối Keycloak Realm [${realm}] thành công. Issuer: ${response.data.issuer}`,
          };
        }
      } catch (err: any) {
        await this.ssoRepo.update(id, { status: 'disconnected' });
        return {
          success: false,
          message: `Kết nối Keycloak thất bại: ${err.message}`,
        };
      }
    }

    try {
      const ldap = require('ldapjs');
      return await new Promise((resolve) => {
        const protocol = provider.tlsEnabled ? 'ldaps' : 'ldap';
        const client = ldap.createClient({
          url: `${protocol}://${provider.host}:${provider.port}`,
          timeout: 5000,
          connectTimeout: 5000,
          tlsOptions: {
            rejectUnauthorized: process.env.NODE_ENV === 'production',
          }, // Enforce TLS validation in production (CS-TLS-002)
        });
        client.on('error', async (err: any) => {
          await this.ssoRepo.update(id, { status: 'disconnected' });
          resolve({
            success: false,
            message: `Không thể kết nối: ${err.message}`,
          });
        });
        client.bind(
          provider.bindDn,
          provider.bindPassword,
          async (err: any) => {
            client.destroy();
            if (err) {
              await this.ssoRepo.update(id, { status: 'disconnected' });
              resolve({
                success: false,
                message: `Bind thất bại: ${err.message}`,
              });
            } else {
              await this.ssoRepo.update(id, { status: 'connected' });
              resolve({
                success: true,
                message: `Kết nối thành công đến ${provider.host}:${provider.port}`,
              });
            }
          },
        );
      });
    } catch {
      // Fallback: TCP test
      return await new Promise((resolve) => {
        const net = require('net');
        const socket = net.createConnection(
          { host: provider.host, port: provider.port },
          async () => {
            socket.destroy();
            await this.ssoRepo.update(id, { status: 'connected' });
            resolve({
              success: true,
              message: `Kết nối TCP đến ${provider.host}:${provider.port} thành công`,
            });
          },
        );
        socket.setTimeout(5000);
        socket.on('error', async (e: any) => {
          await this.ssoRepo.update(id, { status: 'disconnected' });
          resolve({
            success: false,
            message: `Không thể kết nối: ${e.message}`,
          });
        });
        socket.on('timeout', async () => {
          socket.destroy();
          await this.ssoRepo.update(id, { status: 'disconnected' });
          resolve({ success: false, message: 'Timeout sau 5 giây' });
        });
      });
    }
  }
}
