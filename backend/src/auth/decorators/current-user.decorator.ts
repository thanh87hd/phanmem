import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

export { JwtPayload };

/**
 * Decorator để lấy thông tin user hiện tại từ JWT trong controller.
 * Returns a typed {@link JwtPayload} instead of `any`.
 *
 * @example
 * ```ts
 * @Get()
 * findAll(@CurrentUser() user: JwtPayload) { ... }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
