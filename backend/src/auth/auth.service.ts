import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Optional,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { KeycloakService, KeycloakProfile } from './keycloak.service';
import { LdapService } from './ldap.service';
import { isAdminRole } from '../utils/role-checker.util';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PasswordChangeRequest } from './entities/password-change-request.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { SecurityConfigService } from '../system-management/security-config.service';
import * as otplib from 'otplib';
const { authenticator } = otplib as any;
import * as QRCode from 'qrcode';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(PasswordChangeRequest)
    private readonly passwordChangeRequestRepo: Repository<PasswordChangeRequest>,
    private readonly securityConfig: SecurityConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: any,
    @Optional() private readonly keycloakService?: KeycloakService,
    @Optional() private readonly ldapService?: LdapService,
  ) {}

  // ==================== TOKEN REVOCATION (SESSION MANAGEMENT) ====================

  async blacklistToken(token: string): Promise<void> {
    if (!token) return;
    try {
      const decoded: any = this.jwtService.decode(token);
      if (decoded && decoded.exp) {
        const ttlMs = Math.max(1000, decoded.exp * 1000 - Date.now());
        await this.cacheManager.set(`blacklist:token:${token}`, true, ttlMs);
      } else {
        await this.cacheManager.set(`blacklist:token:${token}`, true, 8 * 3600 * 1000);
      }
    } catch {
      await this.cacheManager.set(`blacklist:token:${token}`, true, 8 * 3600 * 1000);
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    if (!token) return false;
    try {
      const val = await this.cacheManager.get(`blacklist:token:${token}`);
      return !!val;
    } catch {
      return false;
    }
  }

  // ==================== PASSWORD VALIDATION (PCI DSS 8.3.6) ====================

  validatePasswordComplexity(password: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const passwordMinLength = this.securityConfig.getNumber(
      'PASSWORD_MIN_LENGTH',
      12,
    );
    const passwordComplexity = this.securityConfig.getBoolean(
      'PASSWORD_COMPLEXITY',
      true,
    );

    if (password.length < passwordMinLength) {
      errors.push(`Mật khẩu phải có ít nhất ${passwordMinLength} ký tự`);
    }
    if (passwordComplexity) {
      if (!/[A-Z]/.test(password)) {
        errors.push('Phải chứa ít nhất 1 chữ cái IN HOA (A-Z)');
      }
      if (!/[a-z]/.test(password)) {
        errors.push('Phải chứa ít nhất 1 chữ cái thường (a-z)');
      }
      if (!/[0-9]/.test(password)) {
        errors.push('Phải chứa ít nhất 1 chữ số (0-9)');
      }
      if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
        errors.push('Phải chứa ít nhất 1 ký tự đặc biệt (!@#$%^&*...)');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // ==================== PASSWORD HISTORY (PCI DSS 8.3.7) ====================

  private async checkPasswordHistory(
    userId: number,
    newPassword: string,
  ): Promise<boolean> {
    const user = await this.usersService.findOne(userId);
    if (!user || !user.passwordHistory) return true; // no history = OK

    try {
      const history: string[] = JSON.parse(user.passwordHistory);
      for (const oldHash of history) {
        if (await bcrypt.compare(newPassword, oldHash)) {
          return false; // Password was used before
        }
      }
    } catch {
      // Invalid JSON, skip check
    }
    return true;
  }

  private async addToPasswordHistory(
    userId: number,
    passwordHash: string,
  ): Promise<void> {
    const user = await this.usersService.findOne(userId);
    if (!user) return;

    let history: string[] = [];
    try {
      history = user.passwordHistory ? JSON.parse(user.passwordHistory) : [];
    } catch {
      history = [];
    }

    const historyCount = this.securityConfig.getNumber(
      'PASSWORD_HISTORY_COUNT',
      4,
    );
    history.unshift(passwordHash); // Add newest first
    if (history.length > historyCount) {
      history = history.slice(0, historyCount); // Keep only N most recent
    }

    await this.usersService.update(userId, {
      passwordHistory: JSON.stringify(history),
    });
  }

  // ==================== LOGIN ====================

  async validateUser(
    username: string,
    pass: string,
    ipAddress?: string,
    authMode: 'local' | 'ldap' | 'auto' = 'auto',
  ): Promise<any> {
    const isLdapEnabled = this.securityConfig.getBoolean(
      'AUTH_MODE_LDAP_ENABLED',
      true,
    );
    const isLocalEnabled = this.securityConfig.getBoolean(
      'AUTH_MODE_LOCAL_ENABLED',
      true,
    );

    // 1. Chế độ LDAP tường minh
    if (authMode === 'ldap') {
      if (!isLdapEnabled) {
        throw new UnauthorizedException(
          'Phương thức đăng nhập LDAP/Active Directory đã bị vô hiệu hóa.',
        );
      }
      if (!this.ldapService) {
        throw new UnauthorizedException('Dịch vụ LDAP chưa được khởi tạo.');
      }
      const isLdapValid = await this.ldapService.authenticate(username, pass);
      if (!isLdapValid) return null;
      return this.findOrCreateLdapUser(username);
    }

    // 2. Kiểm tra tài khoản nội bộ trong CSDL
    const user = await this.usersService.findOneByUsername(username);

    // Nếu người dùng không tồn tại ở Local nhưng LDAP đang bật -> thử xác thực LDAP fallback
    if (!user && authMode === 'auto' && isLdapEnabled && this.ldapService) {
      const isLdapValid = await this.ldapService.authenticate(username, pass);
      if (isLdapValid) {
        return this.findOrCreateLdapUser(username);
      }
      return null;
    }

    if (!user) return null;

    // Kiểm tra chính sách tắt đăng nhập cục bộ (ngoại trừ quản trị viên Admin)
    const userRoleStr =
      typeof user.role === 'string'
        ? user.role
        : user.role && typeof user.role === 'object' && 'name' in user.role
          ? String((user.role as any).name || '')
          : '';
    if (!isLocalEnabled && !isAdminRole(userRoleStr)) {
      throw new UnauthorizedException(
        'Đăng nhập bằng tài khoản cục bộ hiện đang bị tắt bởi Quản trị viên.',
      );
    }

    // Kiểm tra tài khoản bị khóa
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      const minutesLeft = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new UnauthorizedException(
        `Tài khoản bị khóa do đăng nhập sai nhiều lần. Thử lại sau ${minutesLeft} phút.`,
      );
    }

    // Kiểm tra tài khoản active
    if (!user.isActive) {
      throw new UnauthorizedException(
        'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ Admin.',
      );
    }

    const isPasswordValid = await bcrypt.compare(pass, user.passwordHash);
    const maxFailedAttempts = this.securityConfig.getNumber(
      'MAX_FAILED_ATTEMPTS',
      5,
    );
    const lockoutMinutes = this.securityConfig.getNumber('LOCKOUT_MINUTES', 30);

    if (!isPasswordValid) {
      // Tăng số lần sai
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const updateData: any = { failedLoginAttempts: failedAttempts };
      const remainingAttempts = maxFailedAttempts - failedAttempts;

      if (failedAttempts >= maxFailedAttempts) {
        const lockUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
        updateData.lockedUntil = lockUntil;
        updateData.failedLoginAttempts = 0;
        await this.usersService.update(user.id, updateData);
        throw new UnauthorizedException(
          `Tài khoản bị khóa ${lockoutMinutes} phút do đăng nhập sai ${maxFailedAttempts} lần liên tiếp.`,
        );
      }

      await this.usersService.update(user.id, updateData);
      if (remainingAttempts <= 2 && remainingAttempts > 0) {
        throw new UnauthorizedException(
          `Mật khẩu không đúng. Còn ${remainingAttempts} lần thử trước khi tài khoản bị khóa.`,
        );
      }
      return null;
    }

    // Reset failed attempts on success & update login tracking
    const loginUpdate: any = {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    };
    if (ipAddress) {
      loginUpdate.lastLoginIp = ipAddress;
    }
    await this.usersService.update(user.id, loginUpdate);

    const { passwordHash, passwordHistory, ...result } = user;
    return result;
  }

  async login(user: any) {
    // Nếu kích hoạt 2FA, cấp token tạm thời có thời hạn 5 phút
    if (user.twoFactorEnabled) {
      const tempPayload = {
        sub: user.id,
        require2FA: true,
      };
      return {
        require2FA: true,
        tempToken: this.jwtService.sign(tempPayload, { expiresIn: '5m' }),
      };
    }

    return this.buildLoginResponse(user);
  }

  // ==================== 2FA / TOTP SERVICES (PCI DSS 8.4) ====================

  async generateTwoFactorSecret(
    userId: number,
  ): Promise<{ qrCodeDataUrl: string; secret: string }> {
    const user = await this.usersService.findOne(userId);
    if (!user) throw new BadRequestException('Người dùng không tồn tại');

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(
      user.username,
      'LPBank Smart Audit',
      secret,
    );

    // Lưu tạm vào database chờ confirm
    await this.usersService.update(userId, { twoFactorTempSecret: secret });

    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return { qrCodeDataUrl, secret };
  }

  async verifyAndEnableTwoFactor(
    userId: number,
    code: string,
  ): Promise<boolean> {
    const user = await this.usersService.findOne(userId);
    if (!user || !user.twoFactorTempSecret) {
      throw new BadRequestException(
        'Yêu cầu kích hoạt 2FA không hợp lệ hoặc đã hết hạn',
      );
    }

    const isValid = authenticator.verify({
      token: code,
      secret: user.twoFactorTempSecret,
    });

    if (!isValid) {
      throw new UnauthorizedException('Mã xác thực OTP không chính xác');
    }

    await this.usersService.update(userId, {
      twoFactorSecret: user.twoFactorTempSecret,
      twoFactorEnabled: true,
      twoFactorTempSecret: null,
    });

    return true;
  }

  async disableTwoFactor(userId: number, code: string): Promise<boolean> {
    const user = await this.usersService.findOne(userId);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('Xác thực 2FA hiện tại không kích hoạt');
    }

    const isValid = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      throw new UnauthorizedException('Mã xác thực OTP không chính xác');
    }

    await this.usersService.update(userId, {
      twoFactorSecret: null,
      twoFactorEnabled: false,
      twoFactorTempSecret: null,
    });

    return true;
  }

  async verifyTwoFactorLogin(tempToken: string, code: string) {
    try {
      const payload = this.jwtService.verify(tempToken);
      if (!payload.require2FA || !payload.sub) {
        throw new BadRequestException('Token xác thực 2FA không hợp lệ');
      }

      const user = await this.usersService.findOne(payload.sub);
      if (!user || !user.twoFactorSecret) {
        throw new BadRequestException('Người dùng chưa kích hoạt 2FA');
      }

      const isValid = authenticator.verify({
        token: code,
        secret: user.twoFactorSecret,
      });

      if (!isValid) {
        throw new UnauthorizedException('Mã xác thực OTP không chính xác');
      }

      // Đăng nhập thành công -> Cấp token toàn quyền đăng nhập
      return this.buildLoginResponse(user);
    } catch (err: any) {
      if (
        err instanceof UnauthorizedException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      throw new UnauthorizedException(
        'Phiên xác thực 2FA đã hết hạn. Vui lòng đăng nhập lại.',
      );
    }
  }

  // ponytail: Single source of truth for JWT payload + login response. Used by login() and verifyTwoFactorLogin().
  private buildLoginResponse(user: any) {
    const passwordExpiryDays = this.securityConfig.getNumber(
      'PASSWORD_EXPIRY_DAYS',
      90,
    );
    const isPasswordExpired = user.passwordChangedAt
      ? Date.now() - new Date(user.passwordChangedAt).getTime() >
        passwordExpiryDays * 24 * 3600 * 1000
      : false;

    const payload = {
      username: user.username,
      sub: user.id,
      role: user.role?.name || user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role?.name || user.role,
        permissions: user.role?.permissions || '',
        mustChangePassword: user.mustChangePassword || false,
        isPasswordExpired,
      },
    };
  }

  // ==================== CHANGE PASSWORD (Enhanced) ====================

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersService.findOne(userId);
    if (!user) throw new UnauthorizedException('Người dùng không tồn tại');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid)
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');

    // Validate complexity (PCI DSS 8.3.6)
    const complexity = this.validatePasswordComplexity(newPassword);
    if (!complexity.valid) {
      throw new ForbiddenException(
        'Mật khẩu không đạt tiêu chuẩn bảo mật:\n• ' +
          complexity.errors.join('\n• '),
      );
    }

    // Check password history (PCI DSS 8.3.7)
    const isUnique = await this.checkPasswordHistory(userId, newPassword);
    const historyCount = this.securityConfig.getNumber(
      'PASSWORD_HISTORY_COUNT',
      4,
    );
    if (!isUnique) {
      throw new ForbiddenException(
        `Không được sử dụng lại ${historyCount} mật khẩu gần nhất. Vui lòng chọn mật khẩu khác.`,
      );
    }

    // Save old password to history before updating
    await this.addToPasswordHistory(userId, user.passwordHash);

    await this.usersService.update(userId, {
      password: newPassword,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    });
  }

  // ==================== ADMIN: RESET PASSWORD ====================

  async adminResetPassword(
    adminId: number,
    adminUsername: string,
    targetUserId: number,
    newPassword?: string,
  ): Promise<{ temporaryPassword: string }> {
    const targetUser = await this.usersService.findOne(targetUserId);
    if (!targetUser) throw new BadRequestException('Người dùng không tồn tại');

    // Generate or use provided password
    const tempPassword = newPassword || this.generateSecurePassword();

    // Validate complexity
    const complexity = this.validatePasswordComplexity(tempPassword);
    if (!complexity.valid) {
      throw new BadRequestException(
        'Mật khẩu không đạt tiêu chuẩn:\n• ' + complexity.errors.join('\n• '),
      );
    }

    // Save old password to history
    await this.addToPasswordHistory(targetUserId, targetUser.passwordHash);

    // Update password with mustChangePassword flag
    await this.usersService.update(targetUserId, {
      password: tempPassword,
      mustChangePassword: true,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    return { temporaryPassword: tempPassword };
  }

  // ==================== ADMIN: FORCE CHANGE PASSWORD ====================

  async forceChangePassword(targetUserId: number): Promise<void> {
    const targetUser = await this.usersService.findOne(targetUserId);
    if (!targetUser) throw new BadRequestException('Người dùng không tồn tại');

    await this.usersService.update(targetUserId, {
      mustChangePassword: true,
    });
  }

  // ==================== ADMIN: UNLOCK ACCOUNT ====================

  async unlockAccount(targetUserId: number): Promise<void> {
    const targetUser = await this.usersService.findOne(targetUserId);
    if (!targetUser) throw new BadRequestException('Người dùng không tồn tại');

    await this.usersService.update(targetUserId, {
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  }

  // ==================== PASSWORD CHANGE REQUESTS ====================

  async requestPasswordChange(
    userId: number,
    username: string,
    reason?: string,
  ): Promise<PasswordChangeRequest> {
    // Check if there's already a pending request
    const existing = await this.passwordChangeRequestRepo.findOne({
      where: { userId, status: 'pending' },
    });
    if (existing) {
      throw new BadRequestException(
        'Bạn đã có một yêu cầu đổi mật khẩu đang chờ duyệt.',
      );
    }

    const request = this.passwordChangeRequestRepo.create({
      userId,
      username,
      reason: reason || 'Yêu cầu đổi mật khẩu',
      status: 'pending',
    });
    return this.passwordChangeRequestRepo.save(request);
  }

  async forgotPassword(username: string, reason?: string): Promise<void> {
    if (!username) {
      throw new BadRequestException('Vui lòng nhập tên đăng nhập');
    }
    const user = await this.usersService.findOneByUsername(username);
    // ponytail: Always succeed to prevent username enumeration. If user doesn't exist, silently no-op.
    if (!user) return;
    await this.requestPasswordChange(
      user.id,
      user.username,
      reason || 'Quên mật khẩu, yêu cầu cấp lại',
    );
  }

  async getPasswordChangeRequests(
    status?: string,
  ): Promise<PasswordChangeRequest[]> {
    const where: any = {};
    if (status) where.status = status;
    return this.passwordChangeRequestRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async approvePasswordChange(
    requestId: number,
    adminId: number,
    adminUsername: string,
    adminNote?: string,
  ): Promise<{ temporaryPassword: string }> {
    const request = await this.passwordChangeRequestRepo.findOne({
      where: { id: requestId },
    });
    if (!request) throw new BadRequestException('Yêu cầu không tồn tại');
    if (request.status !== 'pending')
      throw new BadRequestException('Yêu cầu đã được xử lý');

    // Generate new password
    const tempPassword = this.generateSecurePassword();

    // Reset user's password
    await this.adminResetPassword(
      adminId,
      adminUsername,
      request.userId,
      tempPassword,
    );

    // Update request status
    await this.passwordChangeRequestRepo.update(requestId, {
      status: 'approved',
      adminId,
      adminUsername,
      adminNote: adminNote || 'Đã phê duyệt và tạo mật khẩu tạm thời',
      processedAt: new Date(),
    });

    return { temporaryPassword: tempPassword };
  }

  async rejectPasswordChange(
    requestId: number,
    adminId: number,
    adminUsername: string,
    adminNote?: string,
  ): Promise<void> {
    const request = await this.passwordChangeRequestRepo.findOne({
      where: { id: requestId },
    });
    if (!request) throw new BadRequestException('Yêu cầu không tồn tại');
    if (request.status !== 'pending')
      throw new BadRequestException('Yêu cầu đã được xử lý');

    await this.passwordChangeRequestRepo.update(requestId, {
      status: 'rejected',
      adminId,
      adminUsername,
      adminNote: adminNote || 'Từ chối yêu cầu',
      processedAt: new Date(),
    });
  }

  // ==================== UTILITY ====================

  generateSecurePassword(): string {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const special = '!@#$%^&*()-_=+';
    const all = upper + lower + digits + special;

    let password = '';
    // Ensure at least one of each required type
    password += upper[crypto.randomInt(upper.length)];
    password += lower[crypto.randomInt(lower.length)];
    password += digits[crypto.randomInt(digits.length)];
    password += special[crypto.randomInt(special.length)];

    // Fill remaining (16 chars total)
    for (let i = password.length; i < 16; i++) {
      password += all[crypto.randomInt(all.length)];
    }

    // Shuffle the password (Fisher-Yates)
    const arr = password.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = crypto.randomInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
  }

  // --- SSO / LDAP Integration Prep (Phase 8.3) ---
  async ssoLogin(username: string) {
    // Trong thực tế, hệ thống sẽ xác thực với máy chủ LDAP/Active Directory của Ngân hàng.
    // Ở đây ta giả lập xác thực thành công.
    let user = await this.usersService.findOneByUsername(username);

    // Nếu user chưa tồn tại trong DB nội bộ (lần đầu đăng nhập qua SSO), ta tạo mới
    if (!user) {
      // SECURITY: Generate a cryptographically random password for SSO users
      // so the account cannot be accessed via local login with a known password (CS-AUTHZ-002)
      const randomPassword = this.generateSecurePassword();
      user = await this.usersService.create({
        username,
        password: randomPassword,
        fullName: `${username} (SSO)`,
        email: `${username}@bank.com`,
        departmentId: null, // Sẽ map từ LDAP attributes
        role: 'Kiểm toán viên', // Mặc định
      });
    }

    const payload = {
      username: user!.username,
      sub: user!.id,
      role: user!.role,
      mustChangePassword: false,
      isPasswordExpired: false,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user!.id,
        username: user!.username,
        fullName: user!.fullName,
        role: user!.role?.name || user!.role,
        permissions: user!.role?.permissions || '',
        isSso: true,
      },
    };
  }

  // ==================== KEYCLOAK SSO LOGIN ====================
  async handleKeycloakLogin(profile: KeycloakProfile) {
    if (!this.keycloakService) {
      throw new UnauthorizedException('Keycloak service is not available');
    }
    const user = await this.keycloakService.findOrCreateUser(profile);
    const roleName = user.role?.name || user.role || 'Kiểm toán viên';
    const permissions = user.role?.permissions || '';

    const payload = {
      username: user.username,
      sub: user.id,
      role: roleName,
      mustChangePassword: false,
      isPasswordExpired: false,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: roleName,
        permissions: permissions,
        department: user.department,
        isSso: true,
      },
    };
  }

  // ==================== JIT LDAP USER PROVISIONING ====================
  async findOrCreateLdapUser(username: string): Promise<any> {
    let user = await this.usersService.findOneByUsername(username);
    if (!user) {
      const randomPassword = this.generateSecurePassword();
      user = await this.usersService.create({
        username,
        password: randomPassword,
        fullName: `${username} (LPBank Domain)`,
        email: username.includes('@') ? username : `${username}@lpbank.com.vn`,
        department: 'Khối Kiểm toán Nội bộ',
        role: 'Kiểm toán viên',
        isActive: true,
      });
      user = await this.usersService.findOneByUsername(username);
    }

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Tài khoản đã bị vô hiệu hóa hoặc không tồn tại.',
      );
    }
    const safeUser = user as any;
    const { passwordHash, passwordHistory, ...result } = safeUser;
    return result;
  }

  // ==================== PUBLIC AUTH MODES CONFIG ====================
  async getPublicAuthConfig() {
    const localEnabled = this.securityConfig.getBoolean(
      'AUTH_MODE_LOCAL_ENABLED',
      true,
    );
    const ldapEnabled = this.securityConfig.getBoolean(
      'AUTH_MODE_LDAP_ENABLED',
      true,
    );
    const keycloakConfig = this.keycloakService?.getPublicConfig();
    const keycloakEnabled =
      this.securityConfig.getBoolean('AUTH_MODE_KEYCLOAK_ENABLED', true) &&
      Boolean(keycloakConfig?.enabled);

    const defaultMode = this.securityConfig.get('AUTH_DEFAULT_MODE', 'ALL');
    const allowSelfRegistration = this.securityConfig.getBoolean(
      'ALLOW_SELF_REGISTRATION',
      true,
    );

    return {
      localEnabled,
      ldapEnabled,
      keycloakEnabled,
      defaultMode,
      allowSelfRegistration,
      keycloak: keycloakEnabled ? keycloakConfig : null,
      ldapDomain: 'lpbank.com.vn',
    };
  }

  // ==================== LOCAL SELF-REGISTRATION ====================
  async register(dto: {
    username: string;
    password: string;
    fullName: string;
    email: string;
    phone?: string;
    department?: string;
  }) {
    const isRegisterEnabled = this.securityConfig.getBoolean(
      'ALLOW_SELF_REGISTRATION',
      true,
    );
    if (!isRegisterEnabled) {
      throw new ForbiddenException(
        'Chức năng tự đăng ký tài khoản cục bộ hiện đang bị vô hiệu hóa bởi Quản trị viên.',
      );
    }

    const validation = this.validatePasswordComplexity(dto.password);
    if (!validation.valid) {
      throw new BadRequestException(validation.errors.join('. '));
    }

    const existingUser = await this.usersService.findOneByUsername(
      dto.username,
    );
    if (existingUser) {
      throw new BadRequestException('Tên đăng nhập đã tồn tại trong hệ thống.');
    }

    await this.usersService.create({
      username: dto.username,
      password: dto.password,
      fullName: dto.fullName || dto.username,
      email: dto.email,
      phone: dto.phone,
      department: dto.department || 'Khối Kiểm toán Nội bộ',
      role: 'Kiểm toán viên',
      isActive: true,
    });

    const user = await this.usersService.findOneByUsername(dto.username);
    return this.login(user);
  }
}
