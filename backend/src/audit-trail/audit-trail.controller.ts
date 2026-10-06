import {
  BadRequestException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuditTrailService, AuditActor } from './audit-trail.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action, CaslAbilityFactory } from '../casl/casl-ability.factory';

export const DEFAULT_AUDIT_LIMIT = 100;
export const MAX_AUDIT_LIMIT = 500;
export const DEFAULT_RETENTION_MONTHS = 6;

/** Chuỗi chỉ gồm chữ số (không dấu, không thập phân, không ký hiệu mũ). */
const POSITIVE_INTEGER_PATTERN = /^\d+$/;

/**
 * Ép một tham số query về số nguyên dương hợp lệ — chặn 'abc' (NaN), '-5' (âm) và '0'
 * trước khi chúng tới query builder (Postgres từ chối LIMIT âm ⇒ 500).
 * Giá trị vượt `max` được CẮT về `max` (cap) chứ không báo lỗi, để không phá client cũ.
 */
function parseIntegerParam(
  raw: string | undefined | null,
  field: string,
  options: { fallback?: number; min: number; max?: number },
): number {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    if (options.fallback !== undefined) return options.fallback;
    throw new BadRequestException(`Thiếu tham số '${field}'`);
  }

  const trimmed = String(raw).trim();
  if (!POSITIVE_INTEGER_PATTERN.test(trimmed)) {
    throw new BadRequestException(
      `Tham số '${field}' phải là số nguyên dương, nhận được '${raw}'`,
    );
  }

  const value = Number(trimmed);
  if (!Number.isSafeInteger(value)) {
    throw new BadRequestException(
      `Tham số '${field}' vượt giới hạn số nguyên an toàn, nhận được '${raw}'`,
    );
  }
  if (value < options.min) {
    throw new BadRequestException(
      `Tham số '${field}' phải >= ${options.min}, nhận được '${raw}'`,
    );
  }
  if (options.max !== undefined && value > options.max) {
    return options.max;
  }
  return value;
}

/** `userId` là tuỳ chọn; nếu có thì phải là số nguyên dương. */
function parseOptionalPositiveInt(
  raw: string | undefined | null,
  field: string,
): number | undefined {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return undefined;
  }
  return parseIntegerParam(raw, field, { min: 1 });
}

@Controller('audit-trail')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class AuditTrailController {
  constructor(
    private readonly auditTrailService: AuditTrailService,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  @Get()
  @CheckPolicies((ability) => ability.can(Action.Manage, 'AuditTrail'))
  async findAll(
    @Query('resource') resource?: string,
    @Query('limit') limit?: string,
  ) {
    const validatedLimit = parseIntegerParam(limit, 'limit', {
      fallback: DEFAULT_AUDIT_LIMIT,
      min: 1,
      max: MAX_AUDIT_LIMIT,
    });
    return this.auditTrailService.findAll(resource, validatedLimit);
  }

  @Get('security-alerts')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'AuditTrail'))
  getSecurityAlerts() {
    return this.auditTrailService.findAllAlerts();
  }

  /**
   * Lịch sử thao tác của CHÍNH người đang đăng nhập (sửa lỗ hổng IDOR).
   *
   * Danh tính lấy từ JWT (`req.user.userId`) — KHÔNG tin tham số `userId` do client gửi.
   * Nếu client truyền `userId` khác người gọi: chỉ tài khoản có quyền quản trị AuditTrail
   * (`manage:AuditTrail`) mới được tra cứu hộ; mọi trường hợp khác bị chặn bằng
   * ForbiddenException (fail-closed) thay vì âm thầm trả dữ liệu của người khác.
   */
  @Get('my-actions')
  async findMyActions(@Req() req: any, @Query('userId') userId?: string) {
    const callerId = Number(req?.user?.userId);
    if (!Number.isSafeInteger(callerId) || callerId <= 0) {
      throw new UnauthorizedException(
        'Không xác định được người dùng từ token đăng nhập',
      );
    }

    const requestedId = parseOptionalPositiveInt(userId, 'userId');
    if (requestedId === undefined || requestedId === callerId) {
      return this.auditTrailService.findByUser(callerId);
    }

    const ability = this.caslAbilityFactory.createForUser(req.user);
    if (!ability.can(Action.Manage, 'AuditTrail')) {
      throw new ForbiddenException(
        'Bạn chỉ được xem lịch sử thao tác của chính mình',
      );
    }
    return this.auditTrailService.findByUser(requestedId);
  }

  /** Kiểm tra toàn vẹn (SHA-256) của một bản ghi nhật ký — UAT TC-SYS-05. */
  @Get(':id/verify')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'AuditTrail'))
  async verifyIntegrity(@Param('id') id: string) {
    const logId = parseIntegerParam(id, 'id', { min: 1 });
    return this.auditTrailService.verifyIntegrity(logId);
  }

  @Delete('cleanup')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'AuditTrail'))
  async cleanup(@Req() req: any, @Query('months') months?: string) {
    const retentionMonths = parseIntegerParam(months, 'months', {
      fallback: DEFAULT_RETENTION_MONTHS,
      min: 1,
    });
    const actorId = Number(req?.user?.userId);
    const actor: AuditActor = {
      // chỉ nhận danh tính hợp lệ từ JWT, không ghi id rác vào bản ghi thanh lọc
      userId:
        Number.isSafeInteger(actorId) && actorId > 0 ? actorId : undefined,
      username: req?.user?.username,
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    };
    return this.auditTrailService.cleanupLogs(retentionMonths, actor);
  }
}
