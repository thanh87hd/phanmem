import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UnauthorizedException,
  UseGuards,
  Request,
  Headers,
  Ip,
  Res,
  Optional,
} from '@nestjs/common';
import { KeycloakService } from './keycloak.service';

import * as crypto from 'crypto';
import { Throttle } from '@nestjs/throttler';
import { Public } from './decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/casl-ability.factory';
import {
  ChangePasswordDto,
  AdminResetPasswordDto,
  ApprovePasswordChangeDto,
} from './dto/auth-actions.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Optional() private readonly keycloakService?: KeycloakService,
  ) {}

  // ponytail: Single source of truth for JWT cookie config. Update here, not in each endpoint.
  private setJwtCookie(res: any, token: string) {
    if (typeof res?.setCookie === 'function') {
      res.setCookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000, // 8h
      });
    }
  }

  @Public()
  @Get('config')
  async getAuthConfig() {
    return this.authService.getPublicAuthConfig();
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: any,
  ) {
    const user = await this.authService.validateUser(
      loginDto.username,
      loginDto.password,
      ip,
      loginDto.authMode,
    );
    if (!user) {
      throw new UnauthorizedException(
        'Tên đăng nhập hoặc mật khẩu không chính xác',
      );
    }
    const result = await this.authService.login(user);
    if ('access_token' in result && result.access_token) {
      this.setJwtCookie(res, result.access_token);
    }
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: any,
  ) {
    const result = await this.authService.register(registerDto);
    if ('access_token' in result && result.access_token) {
      this.setJwtCookie(res, result.access_token);
    }
    return result;
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() body: { username: string; reason?: string }) {
    await this.authService.forgotPassword(body.username, body.reason);
    return {
      message:
        'Đã gửi yêu cầu khôi phục mật khẩu thành công. Vui lòng liên hệ Admin để nhận mật khẩu mới.',
    };
  }

  // API đăng nhập qua SSO (LDAP / Active Directory)
  // Chỉ hoạt động khi SSO_ENABLED=true trong .env
  @Public()
  @Post('sso-login')
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  async ssoLogin(
    @Body() req: { username: string },
    @Headers('x-sso-api-key') apiKey: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Kiểm tra SSO có được bật không
    if (process.env.SSO_ENABLED !== 'true') {
      throw new UnauthorizedException(
        'SSO authentication is disabled on this server',
      );
    }
    if (!req.username) {
      throw new UnauthorizedException('Username is required for SSO');
    }
    // Kiểm tra API key bằng constant-time comparison để chống timing attacks
    const validApiKey = process.env.SSO_API_KEY;
    if (!validApiKey || !apiKey) {
      throw new UnauthorizedException('Invalid or missing SSO API key');
    }
    const keyBuf = Buffer.from(apiKey);
    const validBuf = Buffer.from(validApiKey);
    if (
      keyBuf.length !== validBuf.length ||
      !crypto.timingSafeEqual(keyBuf, validBuf)
    ) {
      throw new UnauthorizedException('Invalid or missing SSO API key');
    }
    const result = await this.authService.ssoLogin(req.username);
    if ('access_token' in result && result.access_token) {
      this.setJwtCookie(res, result.access_token);
    }
    return result;
  }

  // ==================== KEYCLOAK SSO ENDPOINTS ====================

  @Public()
  @Get('sso/keycloak/config')
  getKeycloakConfig() {
    if (!this.keycloakService) {
      return { enabled: false };
    }
    return this.keycloakService.getPublicConfig();
  }

  @Public()
  @Post('sso/keycloak/exchange')
  async exchangeKeycloakCode(
    @Body() body: { code: string; redirectUri?: string },
    @Res({ passthrough: true }) res: any,
  ) {
    if (!this.keycloakService || !this.keycloakService.isEnabled()) {
      throw new UnauthorizedException('Keycloak SSO chưa được kích hoạt.');
    }
    if (!body?.code) {
      throw new UnauthorizedException('Thiếu authorization code từ Keycloak.');
    }

    const tokens = await this.keycloakService.exchangeCodeForTokens(
      body.code,
      body.redirectUri,
    );
    const profile = await this.keycloakService.getUserInfo(tokens.access_token);
    const result = await this.authService.handleKeycloakLogin(profile);

    if ('access_token' in result && result.access_token) {
      this.setJwtCookie(res, result.access_token);
    }
    return result;
  }

  @Public()
  @Get('sso/keycloak/login')
  initiateKeycloakLogin(@Query('state') clientState: string, @Res() res: any) {
    if (!this.keycloakService || !this.keycloakService.isEnabled()) {
      throw new UnauthorizedException('Keycloak SSO chưa được kích hoạt.');
    }
    const state = clientState || crypto.randomBytes(16).toString('hex');
    const authUrl = this.keycloakService.getAuthorizationUrl(state);

    if (typeof res.redirect === 'function') {
      return res.redirect(authUrl);
    }
    return res.status(302).header('Location', authUrl).send();
  }

  @Public()
  @Get('sso/keycloak/callback')
  async handleKeycloakCallback(@Query('code') code: string, @Res() res: any) {
    if (!this.keycloakService || !this.keycloakService.isEnabled()) {
      throw new UnauthorizedException('Keycloak SSO chưa được kích hoạt.');
    }
    if (!code) {
      throw new UnauthorizedException('Thiếu Keycloak authorization code.');
    }

    const tokens = await this.keycloakService.exchangeCodeForTokens(code);
    const profile = await this.keycloakService.getUserInfo(tokens.access_token);
    const result = await this.authService.handleKeycloakLogin(profile);

    if (result.access_token) {
      this.setJwtCookie(res, result.access_token);
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/login?sso_token=${encodeURIComponent(
      result.access_token,
    )}&user=${encodeURIComponent(JSON.stringify(result.user))}`;

    if (typeof res.redirect === 'function') {
      return res.redirect(redirectUrl);
    }
    return res.status(302).header('Location', redirectUrl).send();
  }

  @Public()
  @Post('sso/keycloak/test-connection')
  async testKeycloakConnection(
    @Body() body: { baseUrl?: string; realm?: string },
  ) {
    if (!this.keycloakService) {
      return {
        success: false,
        message: 'Keycloak service chưa được khởi tạo.',
      };
    }
    return this.keycloakService.testConnection(body.baseUrl, body.realm);
  }

  // ==================== CHANGE PASSWORD ====================

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Body() dto: ChangePasswordDto, @Request() req: any) {
    await this.authService.changePassword(
      req.user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: 'Đổi mật khẩu thành công' };
  }

  // ==================== VALIDATE PASSWORD (Public utility for frontend) ====================

  @Post('validate-password')
  @UseGuards(JwtAuthGuard)
  async validatePassword(@Body() body: { password: string }) {
    return this.authService.validatePasswordComplexity(body.password);
  }

  // ==================== ADMIN: RESET PASSWORD ====================

  @Post('admin-reset-password')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, 'User'))
  async adminResetPassword(
    @Body() dto: AdminResetPasswordDto,
    @Request() req: any,
  ) {
    const result = await this.authService.adminResetPassword(
      req.user.userId,
      req.user.username,
      dto.targetUserId,
      dto.newPassword,
    );
    return {
      message:
        'Đã reset mật khẩu thành công. Người dùng sẽ phải đổi mật khẩu khi đăng nhập lần tiếp theo.',
      temporaryPassword: result.temporaryPassword,
    };
  }

  // ==================== ADMIN: FORCE CHANGE PASSWORD ====================

  @Post('force-change-password')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, 'User'))
  async forceChangePassword(
    @Body() body: { targetUserId: number },
    @Request() req: any,
  ) {
    await this.authService.forceChangePassword(body.targetUserId);
    return {
      message:
        'Đã yêu cầu người dùng đổi mật khẩu khi đăng nhập lần tiếp theo.',
    };
  }

  // ==================== ADMIN: UNLOCK ACCOUNT ====================

  @Post('unlock-account')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, 'User'))
  async unlockAccount(
    @Body() body: { targetUserId: number },
    @Request() req: any,
  ) {
    await this.authService.unlockAccount(body.targetUserId);
    return { message: 'Đã mở khóa tài khoản thành công.' };
  }

  // ==================== PASSWORD CHANGE REQUESTS ====================

  @Post('request-password-change')
  @UseGuards(JwtAuthGuard)
  async requestPasswordChange(
    @Body() body: { reason?: string },
    @Request() req: any,
  ) {
    await this.authService.requestPasswordChange(
      req.user.userId,
      req.user.username,
      body.reason,
    );
    return {
      message: 'Đã gửi yêu cầu đổi mật khẩu. Vui lòng chờ Admin phê duyệt.',
    };
  }

  @Get('password-change-requests')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, 'User'))
  async getPasswordChangeRequests(@Query('status') status?: string) {
    return this.authService.getPasswordChangeRequests(status);
  }

  @Post('approve-password-change')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, 'User'))
  async approvePasswordChange(
    @Body() dto: ApprovePasswordChangeDto,
    @Request() req: any,
  ) {
    const result = await this.authService.approvePasswordChange(
      dto.requestId,
      req.user.userId,
      req.user.username,
      dto.adminNote,
    );
    return {
      message: 'Đã phê duyệt yêu cầu đổi mật khẩu.',
      temporaryPassword: result.temporaryPassword,
    };
  }

  @Post('reject-password-change')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, 'User'))
  async rejectPasswordChange(
    @Body() body: { requestId: number; adminNote?: string },
    @Request() req: any,
  ) {
    await this.authService.rejectPasswordChange(
      body.requestId,
      req.user.userId,
      req.user.username,
      body.adminNote,
    );
    return { message: 'Đã từ chối yêu cầu đổi mật khẩu.' };
  }

  // ==================== 2FA / TOTP CONTROLLERS (PCI DSS 8.4) ====================

  @Post('2fa/generate')
  @UseGuards(JwtAuthGuard)
  async generate2Fa(@Request() req: any) {
    return this.authService.generateTwoFactorSecret(req.user.userId);
  }

  @Post('2fa/turn-on')
  @UseGuards(JwtAuthGuard)
  async turnOn2Fa(@Body() body: { code: string }, @Request() req: any) {
    await this.authService.verifyAndEnableTwoFactor(req.user.userId, body.code);
    return { message: 'Đã kích hoạt xác thực 2 yếu tố thành công.' };
  }

  @Post('2fa/turn-off')
  @UseGuards(JwtAuthGuard)
  async turnOff2Fa(@Body() body: { code: string }, @Request() req: any) {
    await this.authService.disableTwoFactor(req.user.userId, body.code);
    return { message: 'Đã hủy kích hoạt xác thực 2 yếu tố thành công.' };
  }

  @Public()
  @Post('verify-2fa')
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  async verify2FaLogin(
    @Body() body: { tempToken: string; code: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!body.tempToken || !body.code) {
      throw new UnauthorizedException('Thiếu mã xác thực hoặc token hợp lệ');
    }
    const result = await this.authService.verifyTwoFactorLogin(
      body.tempToken,
      body.code,
    );
    if ('access_token' in result && result.access_token) {
      this.setJwtCookie(res, result.access_token);
    }
    return result;
  }

  @Post('logout')
  @Public()
  async logout(@Request() req: any, @Res({ passthrough: true }) res: any) {
    const token =
      req?.cookies?.jwt ||
      (req?.headers?.authorization
        ? req.headers.authorization.replace(/^Bearer\s+/i, '').trim()
        : null);

    if (token) {
      await this.authService.blacklistToken(token);
    }

    if (typeof res?.clearCookie === 'function') {
      res.clearCookie('jwt', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
    }
    return { message: 'Đăng xuất thành công' };
  }
}
