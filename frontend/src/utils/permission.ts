const t = (k: string, f?: string) => f || k;
import { subject } from '@casl/ability';
import { buildAbilityForUser } from '../casl/ability';
import {
  isAdminRole,
  isLanhDaoRole,
  isBKSRole,
  isAuditeeRole,
  isTeamLeadRole,
  isAuditorRole,
} from './role-checker.util';

import type { UserProfile, UserRole } from '../types/user-profile';
export type { UserProfile, UserRole };

// Maps frontend action to the key configured in PERM_OPTIONS
export const getPermissionKey = (act: string): string => {
  if (act.startsWith('view:')) {
    const page = act.split(':')[1];
    return page.replace(/-/g, '_'); // e.g. audit-plan -> audit_plan
  }
  if (act.startsWith('wp:')) {
    if (act === 'wp:review' || act === 'wp:approve') return 'quality_control';
    return 'working_papers';
  }
  if (act.startsWith('finding:')) {
    return 'audit_findings';
  }
  if (act.startsWith('plan:')) {
    return 'audit_plan';
  }
  if (act === 'admin:access') {
    return 'roles';
  }
  if (act === 'dashboard:customize') {
    return ''; // Handled by direct role check below
  }
  return '';
};

export const hasPermission = (
  user: UserProfile | null | undefined,
  action: string,
  targetDept?: string,
  targetOwnerId?: number
): boolean => {
  if (!user) return false;

  // 1. Extract role name
  const roleStr = typeof user.role === 'string' 
    ? user.role 
    : (user.role?.name || '');
  const userId = user.id || user.userId;
  const username = user.username?.toLowerCase() || '';

  // 2. ADMINS / CAE (Trưởng Ban KTNB) have full control over everything by default
  if (
    username === 'admin' ||
    isAdminRole(roleStr) ||
    isLanhDaoRole(roleStr)
  ) {
    return true;
  }

  const ability = buildAbilityForUser(user as UserProfile);

  // ===== ABAC CASL Enforcement for Core Entities =====
  if (action === 'wp:create') return ability.can('create', 'WorkingPaper');
  if (action === 'wp:delete') return ability.can('delete', 'WorkingPaper');
  if (action === 'wp:edit') {
    if (targetOwnerId !== undefined) {
      return ability.can('update', subject('WorkingPaper', { creatorId: targetOwnerId } as any));
    }
    return ability.can('update', 'WorkingPaper');
  }

  if (action === 'finding:create') return ability.can('create', 'AuditFinding');
  if (action === 'finding:delete') return ability.can('delete', 'AuditFinding');
  if (action === 'finding:edit') {
    if (targetOwnerId !== undefined) {
      return ability.can('update', subject('AuditFinding', { creatorId: targetOwnerId } as any));
    }
    return ability.can('update', 'AuditFinding');
  }

  // 3. Strict Check for Dynamic Permissions Switch Matrix if available
  let permissionsStr = '';
  if (user.permissions) {
    permissionsStr = user.permissions;
  } else if (user.role && typeof user.role === 'object' && user.role.permissions) {
    permissionsStr = user.role.permissions;
  }

  // Always allow personal workspace modules (BSC-KPI, Timesheet, Training, etc.)
  if (action === 'view:bsc-kpi' || action === 'view:bsc_kpi' || action === 'view:timesheet' || action === 'view:training-cpe') {
    return true;
  }

  if (permissionsStr) {
    const requiredKey = getPermissionKey(action);
    if (requiredKey) {
      // Always allow bsc_kpi & newly integrated modules
      const allowedNewModules = [
        'bsc_kpi',
        'test_of_control',
        'audit_ratings',
        'scenario_risk_map',
        'resource_capacity',
        'raci_governance',
        'thematic_analysis'
      ];
      if (allowedNewModules.includes(requiredKey)) return true;

      // Bán Bypass: Admin luôn được truy cập system-management và password-change-requests
      const isSystemAdminPerm = requiredKey === 'system_management' || requiredKey === 'password_change_requests';
      if (isSystemAdminPerm && (username === 'admin' || isAdminRole(roleStr))) {
        return true;
      }

      const permsArray = permissionsStr.split(',').map(p => p.trim().toLowerCase());
      if (!permsArray.includes(requiredKey.toLowerCase())) {
        return false; // Statically block if switch is turned off
      }
    }
  }

  // 3b. Dashboard Customize — allowed for BKS and senior roles
  if (action === 'dashboard:customize') {
    return isBKSRole(roleStr);
  }

  // 4. AUDITEE / ĐƠN VỊ ĐƯỢC KIỂM TOÁN can only do auditee portal actions
  if (isAuditeeRole(roleStr)) {
    if (action.startsWith('auditee:')) {
      if (!targetDept) return true;
      return user.department === targetDept;
    }
    return false;
  }

  // 5. TRƯỞNG ĐOÀN / TRƯỞNG PHÒNG (Audit Team Leads)
  if (isTeamLeadRole(roleStr)) {
    if (action.startsWith('view:')) return true;

    if (action === 'rec:edit') {
      if (!targetDept) return true;
      return user.department === targetDept || user.teamCode === targetDept;
    }

    if (action === 'wp:review' || action === 'wp:approve') return true;
    if (action === 'plan:approve' || action === 'admin:access') return false;

    return true;
  }

  // 6. KIỂM TOÁN VIÊN THÔNG THƯỜNG / THÀNH VIÊN (Staff Auditors)
  if (isAuditorRole(roleStr)) {
    if (action.startsWith('view:')) {
      const pageKey = action.split(':')[1];
      const excludedPages = ['roles', 'personnel', 'seeder', 'departments'];
      return !excludedPages.includes(pageKey);
    }

    if (
      action === 'wp:review' ||
      action === 'wp:approve' ||
      action === 'plan:create' ||
      action === 'plan:approve' ||
      action === 'admin:access'
    ) {
      return false;
    }

    return false;
  }

  return false;
};
