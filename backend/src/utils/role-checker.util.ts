export const RoleKeywords = {
  ADMIN: ['admin', 'quản trị'],
  LANH_DAO: ['trưởng ban ktnb', 'lãnh đạo ktnb', 'giám đốc khối'],
  BKS: [
    'ban kiểm soát',
    'trưởng ban kiểm soát',
    'phó trưởng ban kiểm soát',
    'thành viên ban kiểm soát',
  ],
  AUDITEE: ['đơn vị', 'auditee'],
  TEAM_LEAD: ['trưởng đoàn', 'trưởng nhóm', 'phòng', 'lead'],
  AUDITOR: ['kiểm toán viên', 'ktv', 'thành viên', 'thư ký'],
};

export function checkRoleMatches(role: string, keywords: string[]): boolean {
  if (!role) return false;
  const roleLower = role.toString().toLowerCase();
  return keywords.some((kw) => roleLower.includes(kw));
}

export const isAdminRole = (role: string) =>
  checkRoleMatches(role, RoleKeywords.ADMIN);
export const isLanhDaoRole = (role: string) =>
  checkRoleMatches(role, RoleKeywords.LANH_DAO);
export const isBKSRole = (role: string) =>
  checkRoleMatches(role, RoleKeywords.BKS);
export const isAuditeeRole = (role: string) =>
  checkRoleMatches(role, RoleKeywords.AUDITEE);
export const isTeamLeadRole = (role: string) =>
  checkRoleMatches(role, RoleKeywords.TEAM_LEAD);
export const isAuditorRole = (role: string) =>
  checkRoleMatches(role, RoleKeywords.AUDITOR);
