import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable } from 'rxjs';
import { SessionActivity } from '../entities/session-activity.entity';
import { SecurityConfigService } from '../../system-management/security-config.service';
import { Reflector } from '@nestjs/core';

@Injectable()
export class SessionTimeoutInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(SessionActivity)
    private readonly sessionRepo: Repository<SessionActivity>,
    private readonly securityConfig: SecurityConfigService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Skip for public endpoints (no user)
    if (!user) {
      return next.handle();
    }

    const timeoutMinutes = this.securityConfig.getNumber(
      'SESSION_TIMEOUT_MINUTES',
      15,
    );

    // Find the active session for this user
    const session = await this.sessionRepo.findOne({
      where: { userId: user.userId, isActive: true },
      order: { loginAt: 'DESC' },
    });

    const ip = request.ip || request.connection?.remoteAddress || '';
    const userAgent = request.headers?.['user-agent'] || '';
    const tokenIssuedAt = (user.iat || 0) * 1000;

    if (session) {
      const lastActivity = new Date(session.lastActivityAt).getTime();
      const sessionLogin = new Date(session.loginAt).getTime();
      const now = Date.now();
      const idleMinutes = (now - lastActivity) / (60 * 1000);

      // Nếu token được cấp mới hơn/bằng session hoặc token mới trong vòng 5 phút (vừa login lại):
      // Làm mới session thay vì báo hết hạn
      if (
        tokenIssuedAt &&
        (tokenIssuedAt >= sessionLogin ||
          tokenIssuedAt >= lastActivity - 10000 ||
          now - tokenIssuedAt < 300000)
      ) {
        await this.sessionRepo.update(
          { userId: user.userId, isActive: true },
          {
            isActive: false,
            logoutAt: new Date(),
          },
        );

        await this.sessionRepo.save(
          this.sessionRepo.create({
            userId: user.userId,
            username: user.username,
            loginAt: new Date(tokenIssuedAt),
            lastActivityAt: new Date(),
            ipAddress: ip,
            userAgent: userAgent,
            isActive: true,
          }),
        );
        return next.handle();
      }

      if (idleMinutes > timeoutMinutes) {
        // Mark session as inactive
        await this.sessionRepo.update(session.id, {
          isActive: false,
          logoutAt: new Date(),
        });

        throw new UnauthorizedException(
          `Phiên đăng nhập đã hết hạn do không hoạt động quá ${timeoutMinutes} phút. Vui lòng đăng nhập lại.`,
        );
      }

      // Update last activity time
      await this.sessionRepo.update(session.id, {
        lastActivityAt: new Date(),
      });
    } else {
      // Create a new session record if none exists
      await this.sessionRepo.save(
        this.sessionRepo.create({
          userId: user.userId,
          username: user.username,
          loginAt: new Date(tokenIssuedAt || Date.now()),
          lastActivityAt: new Date(),
          ipAddress: ip,
          userAgent: userAgent,
          isActive: true,
        }),
      );
    }

    return next.handle();
  }
}
