import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuditTrailService } from '../../audit-trail/audit-trail.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    // private auditTrailService: AuditTrailService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    const handler = context.getHandler().name;

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles decorator — allow all authenticated users
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    if (!user) return false;

    const userRole = (user.role || '').toString().toLowerCase();
    const isAdmin = userRole.includes('admin') || userRole.includes('quản trị');

    // ADMIN ALWAYS HAS ACCESS
    if (isAdmin) return true;

    const matchRole = (requiredRole: string, currentRole: string): boolean => {
      const req = requiredRole.toLowerCase();
      const usr = currentRole.toLowerCase();

      if (req === usr) return true;

      // Group 1: Ban kiểm soát (Supervisory Board)
      const bksRoles = [
        'ban kiểm soát',
        'trưởng ban kiểm soát',
        'phó trưởng ban kiểm soát',
        'thành viên ban kiểm soát',
      ];
      if (req === 'ban kiểm soát' && bksRoles.includes(usr)) {
        return true;
      }

      // Group 2: Lãnh đạo Khối KTNB
      const lanhDaoKtnbRoles = [
        'trưởng ban ktnb',
        'lãnh đạo ktnb',
        'giám đốc khối kiểm toán nội bộ',
        'phó giám đốc khối kiểm toán nội bộ',
      ];
      if (
        (req === 'trưởng ban ktnb' || req === 'lãnh đạo ktnb') &&
        lanhDaoKtnbRoles.includes(usr)
      ) {
        return true;
      }

      // Group 3: Trưởng đoàn (Audit Team Leader or Department Heads)
      const truongDoanRoles = [
        'trưởng đoàn',
        'trưởng đoàn kiểm toán',
        'phó trưởng đoàn kiểm toán',
        'trưởng nhóm kiểm toán',
        'trưởng phòng kiểm toán hội sở hệ thống',
        'trưởng phòng kiểm toán đơn vị kinh doanh',
        'phó phòng kiểm toán hội sở hệ thống',
        'phó phòng kiểm toán đơn vị kinh doanh',
        'chuyên gia',
        'kiểm toán viên cao cấp',
      ];
      if (
        req === 'trưởng đoàn' &&
        (truongDoanRoles.includes(usr) || lanhDaoKtnbRoles.includes(usr))
      ) {
        return true;
      }

      // Group 4: Kiểm toán viên (Auditor)
      const ktvRoles = [
        'kiểm toán viên',
        'kiểm toán viên chính',
        'kiểm toán viên cao cấp',
        'chuyên gia',
        'thành viên',
        'phó phòng kiểm toán hội sở hệ thống',
        'phó phòng kiểm toán đơn vị kinh doanh',
        'thư ký đoàn',
      ];
      if (
        req === 'kiểm toán viên' &&
        (ktvRoles.includes(usr) ||
          truongDoanRoles.includes(usr) ||
          lanhDaoKtnbRoles.includes(usr))
      ) {
        return true;
      }

      return false;
    };

    const hasRole = requiredRoles.some((role) => matchRole(role, userRole));

    if (!hasRole) {
      throw new ForbiddenException(
        `Bạn không có quyền truy cập. Yêu cầu role: ${requiredRoles.join(' hoặc ')}`,
      );
    }
    return true;
  }
}
