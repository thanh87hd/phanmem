import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

export interface UserScope {
  level: 'GLOBAL' | 'DEPARTMENT' | 'INDIVIDUAL';
  department: string;
  teamCode: string;
  isDivisionLead: boolean;
  isGlobalCaeOrAdmin: boolean;
  isNhanSuTongHop: boolean;
  isNhanSuKhacPhuc: boolean;
  isDeptLead: boolean;
  isAuditor: boolean;
  isAuditee: boolean;
}

/**
 * Centralised service for determining data‑access scope based on a user.
 * Replaces duplicated role‑checking logic across multiple services.
 */
@Injectable()
export class ScopeFilterService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Helper static function to check if a role name represents an Admin / CAE / Leadership role.
   */
  static isAdminRole(roleName?: string, jobTitle?: string): boolean {
    const roleLower = (roleName || '').toString().toLowerCase();
    const jobTitleLower = (jobTitle || '').toString().toLowerCase();

    return (
      roleLower.includes('admin') ||
      roleLower.includes('quản trị') ||
      roleLower === 'trưởng ban ktnb' ||
      roleLower === 'lãnh đạo ktnb' ||
      jobTitleLower.includes('giám đốc khối') ||
      jobTitleLower.includes('phó giám đốc khối') ||
      roleLower.includes('giám đốc khối') ||
      roleLower.includes('ban kiểm soát')
    );
  }

  /**
   * Helper static function to check if a role/job represents a Department/Team Lead.
   */
  static isDeptLeadRole(roleName?: string, jobTitle?: string): boolean {
    if (ScopeFilterService.isAdminRole(roleName, jobTitle)) return false;
    const roleLower = (roleName || '').toString().toLowerCase();
    const jobTitleLower = (jobTitle || '').toString().toLowerCase();

    return (
      roleLower.includes('trưởng phòng') ||
      roleLower.includes('phó phòng') ||
      jobTitleLower.includes('trưởng phòng') ||
      jobTitleLower.includes('phó phòng') ||
      roleLower.includes('trưởng nhóm') ||
      roleLower.includes('trưởng đoàn') ||
      roleLower.includes('lead')
    );
  }

  /**
   * Returns scope information for the supplied user object (typically the decoded JWT payload).
   * If the user cannot be resolved, a safe GLOBAL fallback is returned.
   */
  async getUserFilters(
    user: any,
  ): Promise<{ scope: UserScope; user: User | null }> {
    if (!user || !user.userId) {
      return {
        scope: {
          level: 'GLOBAL',
          isDivisionLead: true,
          isGlobalCaeOrAdmin: true,
          isNhanSuTongHop: false,
          isNhanSuKhacPhuc: false,
          isDeptLead: false,
          isAuditor: false,
          isAuditee: false,
          department: '',
          teamCode: '',
        },
        user: null,
      };
    }

    const fullUser = await this.userRepo.findOne({
      where: { id: user.userId },
      relations: ['role'],
    });

    if (!fullUser) {
      return {
        scope: {
          level: 'GLOBAL',
          isDivisionLead: true,
          isGlobalCaeOrAdmin: true,
          isNhanSuTongHop: false,
          isNhanSuKhacPhuc: false,
          isDeptLead: false,
          isAuditor: false,
          isAuditee: false,
          department: '',
          teamCode: '',
        },
        user: null,
      };
    }

    const roleName = fullUser.role?.name || '';
    const jobTitle = fullUser.jobTitle || '';
    const jobTitleLower = jobTitle.toLowerCase();
    const rolePerms =
      fullUser.role?.permissions || (fullUser as any).permissions;
    const perms = Array.isArray(rolePerms)
      ? rolePerms
      : typeof rolePerms === 'string'
        ? rolePerms.split(',').map((p: string) => p.trim())
        : [];

    const isGlobalCaeOrAdmin = ScopeFilterService.isAdminRole(
      roleName,
      jobTitle,
    );

    const isNhanSuTongHop =
      jobTitleLower === 'nhân sự tổng hợp' || perms.includes('nhansu_tonghop');
    const isNhanSuKhacPhuc =
      jobTitleLower === 'nhân sự khắc phục' ||
      perms.includes('nhansu_khacphuc');

    const isDivisionLead =
      isGlobalCaeOrAdmin || isNhanSuTongHop || isNhanSuKhacPhuc;

    const isDeptLead = ScopeFilterService.isDeptLeadRole(roleName, jobTitle);

    const level: 'GLOBAL' | 'DEPARTMENT' | 'INDIVIDUAL' = isDivisionLead
      ? 'GLOBAL'
      : isDeptLead
        ? 'DEPARTMENT'
        : 'INDIVIDUAL';

    return {
      scope: {
        level,
        department: fullUser.department || '',
        teamCode: fullUser.teamCode || '',
        isDivisionLead,
        isGlobalCaeOrAdmin,
        isNhanSuTongHop,
        isNhanSuKhacPhuc,
        isDeptLead,
        isAuditor: !isDivisionLead && !isDeptLead,
        isAuditee: false,
      },
      user: fullUser,
    };
  }

  /**
   * Placeholder scope filter. Returns the data unchanged.
   */
  async filterByScope(user: any, data: any[]) {
    return data;
  }
}
