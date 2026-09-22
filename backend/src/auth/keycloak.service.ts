import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';
import {
  isAdminRole,
  isLanhDaoRole,
  isBKSRole,
  isAuditeeRole,
  isTeamLeadRole,
} from '../utils/role-checker.util';

export interface KeycloakProfile {
  sub: string;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
  department?: string;
}

export interface KeycloakPublicConfig {
  enabled: boolean;
  baseUrl: string;
  realm: string;
  clientId: string;
  loginUrl: string;
}

@Injectable()
export class KeycloakService {
  private readonly logger = new Logger(KeycloakService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
  ) {}

  isEnabled(): boolean {
    const enabled = this.configService.get<string>('KEYCLOAK_ENABLED');
    if (enabled !== undefined) {
      return enabled === 'true';
    }
    // Auto-enable if baseUrl is configured
    return !!this.configService.get<string>('KEYCLOAK_BASE_URL');
  }

  getBaseUrl(): string {
    return (
      this.configService.get<string>('KEYCLOAK_BASE_URL') ||
      'http://localhost:8080'
    ).replace(/\/+$/, '');
  }

  getRealm(): string {
    return this.configService.get<string>('KEYCLOAK_REALM') || 'lpbank-audit';
  }

  getClientId(): string {
    return (
      this.configService.get<string>('KEYCLOAK_CLIENT_ID') ||
      'lpbank-audit-client'
    );
  }

  getClientSecret(): string {
    return (
      this.configService.get<string>('KEYCLOAK_CLIENT_SECRET') ||
      'lpbank-audit-secret-2026'
    );
  }

  getRedirectUri(): string {
    return (
      this.configService.get<string>('KEYCLOAK_REDIRECT_URI') ||
      'http://localhost:3000/api/auth/sso/keycloak/callback'
    );
  }

  getPublicConfig(): KeycloakPublicConfig {
    const enabled = this.isEnabled();
    return {
      enabled,
      baseUrl: this.getBaseUrl(),
      realm: this.getRealm(),
      clientId: this.getClientId(),
      loginUrl: this.getAuthorizationUrl(),
    };
  }

  getAuthorizationUrl(state?: string, redirectUriOverride?: string): string {
    const baseUrl = this.getBaseUrl();
    const realm = this.getRealm();
    const clientId = this.getClientId();
    const redirectUri = redirectUriOverride || this.getRedirectUri();
    const safeState = state || crypto.randomBytes(16).toString('hex');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile email roles',
      state: safeState,
    });

    return `${baseUrl}/realms/${realm}/protocol/openid-connect/auth?${params.toString()}`;
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUriOverride?: string,
  ): Promise<{
    access_token: string;
    id_token?: string;
    refresh_token?: string;
  }> {
    const baseUrl = this.getBaseUrl();
    const realm = this.getRealm();
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();
    const redirectUri = redirectUriOverride || this.getRedirectUri();

    const tokenUrl = `${baseUrl}/realms/${realm}/protocol/openid-connect/token`;

    const data = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    try {
      const response = await axios.post(tokenUrl, data.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error_description ||
        error.response?.data?.error ||
        error.message;
      this.logger.error(`Keycloak token exchange failed: ${errorMsg}`);
      throw new UnauthorizedException(
        `Xác thực Keycloak thất bại: ${errorMsg}`,
      );
    }
  }

  async getUserInfo(accessToken: string): Promise<KeycloakProfile> {
    const baseUrl = this.getBaseUrl();
    const realm = this.getRealm();
    const userInfoUrl = `${baseUrl}/realms/${realm}/protocol/openid-connect/userinfo`;

    try {
      const response = await axios.get(userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 10000,
      });
      const data = response.data;

      // Extract roles from token or userinfo claims
      const roles: string[] = [];
      if (data.realm_access?.roles) {
        roles.push(...data.realm_access.roles);
      }
      if (data.resource_access?.[this.getClientId()]?.roles) {
        roles.push(...data.resource_access[this.getClientId()].roles);
      }
      if (Array.isArray(data.roles)) {
        roles.push(...data.roles);
      }

      const fullName =
        data.name ||
        [data.given_name, data.family_name].filter(Boolean).join(' ') ||
        data.preferred_username ||
        data.email;

      return {
        sub: data.sub,
        username: data.preferred_username || data.email?.split('@')[0],
        email: data.email || `${data.preferred_username}@lpbank.com.vn`,
        fullName,
        roles,
        department: data.department || 'Khối Kiểm toán Nội bộ',
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch Keycloak UserInfo: ${error.message}`);
      throw new UnauthorizedException(
        'Không thể lấy thông tin người dùng từ Keycloak.',
      );
    }
  }

  async resolveSystemRole(keycloakRoles: string[]): Promise<any> {
    const roles = await this.rolesService.findAll();
    if (!roles || roles.length === 0) return null;

    // Check high privileges first
    for (const kr of keycloakRoles) {
      if (isAdminRole(kr)) {
        const found = roles.find((r) => isAdminRole(r.name));
        if (found) return found;
      }
      if (isLanhDaoRole(kr)) {
        const found = roles.find((r) => isLanhDaoRole(r.name));
        if (found) return found;
      }
      if (isBKSRole(kr)) {
        const found = roles.find((r) => isBKSRole(r.name));
        if (found) return found;
      }
      if (isTeamLeadRole(kr)) {
        const found = roles.find((r) => isTeamLeadRole(r.name));
        if (found) return found;
      }
      if (isAuditeeRole(kr)) {
        const found = roles.find((r) => isAuditeeRole(r.name));
        if (found) return found;
      }
    }

    // Default fallback: Kiểm toán viên or first available role
    return (
      roles.find((r) => r.name.toLowerCase().includes('kiểm toán viên')) ||
      roles[0]
    );
  }

  async findOrCreateUser(profile: KeycloakProfile): Promise<any> {
    let user = await this.usersService.findOneByUsername(profile.username);
    if (!user && profile.email) {
      user = await this.usersService.findOneByUsername(profile.email);
    }

    if (user) {
      if (!user.isActive) {
        throw new UnauthorizedException(
          'Tài khoản đã bị vô hiệu hóa trong hệ thống.',
        );
      }
      return user;
    }

    // JIT Provisioning
    this.logger.log(
      `JIT Provisioning new user for Keycloak account: ${profile.username}`,
    );

    const matchedRole = await this.resolveSystemRole(profile.roles);
    const randomPassword = crypto.randomBytes(32).toString('hex') + 'A1!';

    const created = await this.usersService.create({
      username: profile.username,
      email: profile.email,
      fullName: profile.fullName,
      password: randomPassword,
      roleId: matchedRole?.id,
      department: profile.department || 'Khối Kiểm toán Nội bộ',
      isActive: true,
    });

    // Re-fetch with relations
    return this.usersService.findOneByUsername(profile.username);
  }

  async testConnection(
    baseUrlOverride?: string,
    realmOverride?: string,
  ): Promise<{ success: boolean; message: string; issuer?: string }> {
    const baseUrl = (baseUrlOverride || this.getBaseUrl()).replace(/\/+$/, '');
    const realm = realmOverride || this.getRealm();
    const discoveryUrl = `${baseUrl}/realms/${realm}/.well-known/openid-configuration`;

    try {
      const response = await axios.get(discoveryUrl, { timeout: 5000 });
      if (response.status === 200 && response.data.issuer) {
        return {
          success: true,
          message: `Kết nối thành công tới Keycloak Realm [${realm}].`,
          issuer: response.data.issuer,
        };
      }
      return {
        success: false,
        message:
          'Endpoint phản hồi nhưng không tìm thấy thông tin OpenID Issuer.',
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Kết nối tới Keycloak thất bại: ${error.message}`,
      };
    }
  }
}
