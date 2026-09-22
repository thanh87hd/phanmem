export const RoleKeywords = {
  ADMIN: ['admin', 'quản trị'],
  LANH_DAO_KHOI: [
    'trưởng ban ktnb',
    'lãnh đạo ktnb',
    'giám đốc khối',
    'phó giám đốc khối',
    'ban kiểm soát',
    'trưởng ban kiểm soát',
    'phó trưởng ban kiểm soát',
    'thành viên ban kiểm soát',
    'admin',
  ],
  LANH_DAO_PHONG: [
    'trưởng phòng',
    'phó phòng',
    'trưởng nhóm',
    'trưởng đoàn',
    'lead',
  ],
  AUDITOR: [
    'chuyên gia',
    'kiểm toán viên cao cấp',
    'kiểm toán viên chính',
    'kiểm toán viên',
    'ktv',
    'thành viên',
    'thư ký',
  ],
  AUDITEE: ['đơn vị', 'đơn vị được kiểm toán', 'auditee'],
};

export function checkRoleMatches(role: string, keywords: string[]): boolean {
  if (!role) return false;
  const roleLower = role.toString().toLowerCase();
  return keywords.some((kw) => roleLower.includes(kw));
}

export const isAdminRole = (role: string) =>
  checkRoleMatches(role, RoleKeywords.ADMIN);

export const isLanhDaoKhoiRole = (role: string) =>
  checkRoleMatches(role, RoleKeywords.LANH_DAO_KHOI);

export const isLanhDaoPhongRole = (role: string) =>
  checkRoleMatches(role, RoleKeywords.LANH_DAO_PHONG);

export const isBKSRole = (role: string) =>
  checkRoleMatches(role, RoleKeywords.LANH_DAO_KHOI);

export const isAuditeeRole = (role: string) =>
  checkRoleMatches(role, RoleKeywords.AUDITEE);

export const isAuditorRole = (role: string) =>
  checkRoleMatches(role, RoleKeywords.AUDITOR);

// Legacy aliases
export const isLanhDaoRole = isLanhDaoKhoiRole;
export const isTeamLeadRole = isLanhDaoPhongRole;

export type ScopeLevel = 'GLOBAL' | 'DEPARTMENT' | 'INDIVIDUAL' | 'AUDITEE';

export interface UserScopeInfo {
  level: ScopeLevel;
  department: string;
  teamCode: string;
  isDivisionLead: boolean;
  isDeptLead: boolean;
  isAuditor: boolean;
  isAuditee: boolean;
}

export function getUserScope(user: any): UserScopeInfo {
  if (!user) {
    return {
      level: 'INDIVIDUAL',
      department: '',
      teamCode: '',
      isDivisionLead: false,
      isDeptLead: false,
      isAuditor: true,
      isAuditee: false,
    };
  }

  const roleStr = typeof user.role === 'string' ? user.role : (user.role?.name || '');
  const username = (user.username || '').toLowerCase();
  const department = user.department || '';
  const teamCode = user.teamCode || '';

  if (username === 'admin' || isLanhDaoKhoiRole(roleStr)) {
    return {
      level: 'GLOBAL',
      department,
      teamCode,
      isDivisionLead: true,
      isDeptLead: false,
      isAuditor: false,
      isAuditee: false,
    };
  }

  if (isLanhDaoPhongRole(roleStr)) {
    return {
      level: 'DEPARTMENT',
      department,
      teamCode,
      isDivisionLead: false,
      isDeptLead: true,
      isAuditor: false,
      isAuditee: false,
    };
  }

  if (isAuditeeRole(roleStr)) {
    return {
      level: 'AUDITEE',
      department,
      teamCode,
      isDivisionLead: false,
      isDeptLead: false,
      isAuditor: false,
      isAuditee: true,
    };
  }

  return {
    level: 'INDIVIDUAL',
    department,
    teamCode,
    isDivisionLead: false,
    isDeptLead: false,
    isAuditor: true,
    isAuditee: false,
  };
}
