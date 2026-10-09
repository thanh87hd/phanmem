import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { getRequiredJwtSecret } from '../common/security/jwt-secret';

const extractJwtFromCookie = (req: any) => {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies['jwt'];
  }
  return token || ExtractJwt.fromAuthHeaderAsBearerToken()(req);
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: any,
  ) {
    super({
      jwtFromRequest: extractJwtFromCookie,
      ignoreExpiration: false,
      secretOrKey: getRequiredJwtSecret(configService),
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    const rawToken = extractJwtFromCookie(req);
    if (rawToken) {
      try {
        const isBlacklisted = await this.cacheManager.get(
          `blacklist:token:${rawToken}`,
        );
        if (isBlacklisted) {
          throw new UnauthorizedException(
            'Phiên đăng nhập đã kết thúc do tài khoản đã đăng xuất. Vui lòng đăng nhập lại.',
          );
        }
      } catch (err: any) {
        if (err instanceof UnauthorizedException) throw err;
      }
    }

    const user = await this.usersService.findOneByUsername(payload.username);
    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.',
      );
    }
    if (user.status && user.status !== 'Active') {
      throw new UnauthorizedException(
        `Tài khoản không ở trạng thái hoạt động (${user.status}).`,
      );
    }
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      throw new UnauthorizedException('Tài khoản hiện đang bị khóa.');
    }

    // Chống Session Hijacking / Token Stale khi đổi mật khẩu
    if (user.passwordChangedAt && payload.iat) {
      const passwordChangedSec = Math.floor(
        new Date(user.passwordChangedAt).getTime() / 1000,
      );
      // Nếu token được cấp trước thời điểm đổi mật khẩu (trừ 1s buffer sai lệch mili-giây)
      if (payload.iat < passwordChangedSec - 1) {
        throw new UnauthorizedException(
          'Mật khẩu tài khoản đã thay đổi. Vui lòng đăng nhập lại.',
        );
      }
    }

    const currentRole = user.role?.name || payload.role;
    const permissions = user.role?.permissions
      ? user.role.permissions.split(',')
      : [];
    // teamCode/fullName PHẢI được trả về: TasksService, AuditEngagementsService và
    // RiskControlMatrixService lọc dữ liệu theo `user.teamCode`, còn AuditTrail
    // ghi `user.fullName` làm tên người thao tác. Thiếu 2 trường này thì
    // `... = :team` so với NULL (không bao giờ khớp) → người dùng mất quyền xem
    // dữ liệu của chính nhóm mình.
    return {
      userId: payload.sub,
      username: payload.username,
      role: currentRole,
      permissions: permissions,
      department: user.department,
      legacyDepartment: user.department,
      teamCode: user.teamCode,
      fullName: user.fullName,
      iat: payload.iat,
    };
  }
}
