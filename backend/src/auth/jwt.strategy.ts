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
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      throw new UnauthorizedException('Tài khoản hiện đang bị khóa.');
    }
    const permissions = user.role?.permissions
      ? user.role.permissions.split(',')
      : [];
    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
      permissions: permissions,
      department: user.department,
      legacyDepartment: user.department,
      iat: payload.iat,
    };
  }
}
