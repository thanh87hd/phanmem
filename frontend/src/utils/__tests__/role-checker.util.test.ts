import { describe, it, expect } from 'vitest';
import {
  RoleKeywords,
  checkRoleMatches,
  isAdminRole,
  isLanhDaoKhoiRole,
  isLanhDaoPhongRole,
  isAuditeeRole,
  isAuditorRole,
  isBKSRole,
  isLanhDaoRole,
  isTeamLeadRole,
  getUserScope,
} from '../role-checker.util';
import type { ScopeLevel } from '../role-checker.util';

describe('role-checker.util', () => {
  // ─────────────────────────────────────────────────────────────
  // checkRoleMatches
  // ─────────────────────────────────────────────────────────────
  describe('checkRoleMatches', () => {
    it('returns true when role contains keyword (case insensitive)', () => {
      expect(checkRoleMatches('Quản trị hệ thống (Admin)', ['admin'])).toBe(true);
    });

    it('returns false when role does not contain keyword', () => {
      expect(checkRoleMatches('Kiểm toán viên', ['admin'])).toBe(false);
    });

    it('returns false for empty role string', () => {
      expect(checkRoleMatches('', ['admin'])).toBe(false);
    });

    it('returns false for null/undefined role', () => {
      expect(checkRoleMatches(null as any, ['admin'])).toBe(false);
      expect(checkRoleMatches(undefined as any, ['admin'])).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Role checker functions
  // ─────────────────────────────────────────────────────────────
  describe('isAdminRole', () => {
    it('matches admin keyword', () => {
      expect(isAdminRole('Admin')).toBe(true);
      expect(isAdminRole('Quản trị hệ thống (Admin)')).toBe(true);
      expect(isAdminRole('Quản trị viên')).toBe(true);
    });
    it('does not match non-admin roles', () => {
      expect(isAdminRole('Kiểm toán viên')).toBe(false);
      expect(isAdminRole('Trưởng đoàn')).toBe(false);
    });
  });

  describe('isLanhDaoKhoiRole', () => {
    it('matches division leadership roles', () => {
      expect(isLanhDaoKhoiRole('Trưởng Ban KTNB (CAE)')).toBe(true);
      expect(isLanhDaoKhoiRole('Lãnh đạo KTNB')).toBe(true);
      expect(isLanhDaoKhoiRole('Giám đốc khối kiểm toán')).toBe(true);
      expect(isLanhDaoKhoiRole('Ban kiểm soát')).toBe(true);
    });
    it('does not match auditor roles', () => {
      expect(isLanhDaoKhoiRole('Kiểm toán viên')).toBe(false);
    });
  });

  describe('isLanhDaoPhongRole', () => {
    it('matches department leadership roles', () => {
      expect(isLanhDaoPhongRole('Trưởng phòng KTNB')).toBe(true);
      expect(isLanhDaoPhongRole('Phó phòng')).toBe(true);
      expect(isLanhDaoPhongRole('Trưởng đoàn kiểm toán (Team Lead)')).toBe(true);
      expect(isLanhDaoPhongRole('Trưởng nhóm')).toBe(true);
    });
    it('does not match auditor/admin', () => {
      expect(isLanhDaoPhongRole('Kiểm toán viên')).toBe(false);
    });
  });

  describe('isAuditeeRole', () => {
    it('matches auditee roles', () => {
      expect(isAuditeeRole('Đơn vị được kiểm toán (Auditee)')).toBe(true);
      expect(isAuditeeRole('Đơn vị CN Hà Nội')).toBe(true);
    });
    it('does not match auditor', () => {
      expect(isAuditeeRole('Kiểm toán viên')).toBe(false);
    });
  });

  describe('isAuditorRole', () => {
    it('matches auditor roles', () => {
      expect(isAuditorRole('Kiểm toán viên (Auditor)')).toBe(true);
      expect(isAuditorRole('Kiểm toán viên cao cấp')).toBe(true);
      expect(isAuditorRole('Chuyên gia kiểm toán')).toBe(true);
      expect(isAuditorRole('Thư ký đoàn kiểm toán')).toBe(true);
    });
    it('does not match admin', () => {
      expect(isAuditorRole('Admin')).toBe(false);
    });
  });

  describe('isBKSRole', () => {
    it('is an alias of isLanhDaoKhoiRole', () => {
      expect(isBKSRole('Ban kiểm soát')).toBe(true);
      expect(isBKSRole('Kiểm toán viên')).toBe(false);
    });
  });

  describe('legacy aliases', () => {
    it('isLanhDaoRole is alias of isLanhDaoKhoiRole', () => {
      expect(isLanhDaoRole).toBe(isLanhDaoKhoiRole);
    });
    it('isTeamLeadRole is alias of isLanhDaoPhongRole', () => {
      expect(isTeamLeadRole).toBe(isLanhDaoPhongRole);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // RC-01, RC-02: getUserScope
  // ─────────────────────────────────────────────────────────────
  describe('getUserScope', () => {
    it('returns INDIVIDUAL with defaults for null user', () => {
      const scope = getUserScope(null);
      expect(scope.level).toBe('INDIVIDUAL');
      expect(scope.department).toBe('');
      expect(scope.isDivisionLead).toBe(false);
      expect(scope.isAuditor).toBe(true);
      expect(scope.isAuditee).toBe(false);
    });

    it('returns INDIVIDUAL with defaults for undefined user', () => {
      const scope = getUserScope(undefined);
      expect(scope.level).toBe('INDIVIDUAL');
    });

    it('returns GLOBAL for admin username', () => {
      const scope = getUserScope({ username: 'admin', role: 'Auditor' });
      expect(scope.level).toBe('GLOBAL');
      expect(scope.isDivisionLead).toBe(true);
      expect(scope.isAuditor).toBe(false);
    });

    it('returns GLOBAL for CAE/Trưởng Ban KTNB role', () => {
      const scope = getUserScope({
        username: 'cae_user',
        role: 'Trưởng Ban KTNB (CAE)',
        department: 'BAN_KTNB',
      });
      expect(scope.level).toBe('GLOBAL');
      expect(scope.isDivisionLead).toBe(true);
      expect(scope.department).toBe('BAN_KTNB');
    });

    it('returns GLOBAL for Ban kiểm soát role', () => {
      const scope = getUserScope({
        username: 'bks_user',
        role: 'Thành viên Ban kiểm soát',
      });
      expect(scope.level).toBe('GLOBAL');
    });

    it('returns DEPARTMENT for Trưởng đoàn role', () => {
      const scope = getUserScope({
        username: 'team_lead_1',
        role: 'Trưởng đoàn kiểm toán (Team Lead)',
        department: 'P_KTNB1',
        teamCode: 'TEAM_01',
      });
      expect(scope.level).toBe('DEPARTMENT');
      expect(scope.isDeptLead).toBe(true);
      expect(scope.department).toBe('P_KTNB1');
      expect(scope.teamCode).toBe('TEAM_01');
    });

    it('returns DEPARTMENT for Trưởng phòng role', () => {
      const scope = getUserScope({
        username: 'dept_head',
        role: 'Trưởng phòng KTNB',
      });
      expect(scope.level).toBe('DEPARTMENT');
      expect(scope.isDeptLead).toBe(true);
    });

    it('returns AUDITEE for auditee role', () => {
      const scope = getUserScope({
        username: 'cn_hanoi',
        role: 'Đơn vị được kiểm toán (Auditee)',
        department: 'CN_HANOI',
      });
      expect(scope.level).toBe('AUDITEE');
      expect(scope.isAuditee).toBe(true);
      expect(scope.isAuditor).toBe(false);
      expect(scope.department).toBe('CN_HANOI');
    });

    it('returns INDIVIDUAL for regular auditor', () => {
      const scope = getUserScope({
        username: 'auditor1',
        role: 'Kiểm toán viên (Auditor)',
        department: 'P_KTNB1',
      });
      expect(scope.level).toBe('INDIVIDUAL');
      expect(scope.isAuditor).toBe(true);
      expect(scope.isDivisionLead).toBe(false);
      expect(scope.isDeptLead).toBe(false);
    });

    it('handles role as object { name: string }', () => {
      const scope = getUserScope({
        username: 'user1',
        role: { name: 'Trưởng đoàn kiểm toán' },
      });
      expect(scope.level).toBe('DEPARTMENT');
    });

    it('handles missing department/teamCode gracefully', () => {
      const scope = getUserScope({ username: 'auditor2', role: 'Kiểm toán viên' });
      expect(scope.department).toBe('');
      expect(scope.teamCode).toBe('');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // RoleKeywords structure validation
  // ─────────────────────────────────────────────────────────────
  describe('RoleKeywords', () => {
    it('has all expected groups', () => {
      expect(RoleKeywords).toHaveProperty('ADMIN');
      expect(RoleKeywords).toHaveProperty('LANH_DAO_KHOI');
      expect(RoleKeywords).toHaveProperty('LANH_DAO_PHONG');
      expect(RoleKeywords).toHaveProperty('AUDITOR');
      expect(RoleKeywords).toHaveProperty('AUDITEE');
    });

    it('each group has at least 1 keyword', () => {
      Object.values(RoleKeywords).forEach((keywords) => {
        expect(keywords.length).toBeGreaterThan(0);
      });
    });
  });
});
