import { describe, it, expect } from 'vitest';
import { getPermissionKey, hasPermission, UserProfile } from '../permission';

describe('permission utils', () => {
  describe('getPermissionKey', () => {
    it('maps view actions correctly with hyphen to underscore replacement', () => {
      expect(getPermissionKey('view:audit-plan')).toBe('audit_plan');
      expect(getPermissionKey('view:working-papers')).toBe('working_papers');
    });

    it('maps working paper actions correctly', () => {
      expect(getPermissionKey('wp:review')).toBe('quality_control');
      expect(getPermissionKey('wp:approve')).toBe('quality_control');
      expect(getPermissionKey('wp:edit')).toBe('working_papers');
      expect(getPermissionKey('wp:create')).toBe('working_papers');
    });

    it('maps finding, plan, admin actions correctly', () => {
      expect(getPermissionKey('finding:create')).toBe('audit_findings');
      expect(getPermissionKey('plan:create')).toBe('audit_plan');
      expect(getPermissionKey('admin:access')).toBe('roles');
      expect(getPermissionKey('dashboard:customize')).toBe('');
      expect(getPermissionKey('unknown:action')).toBe('');
    });
  });

  describe('hasPermission', () => {
    it('returns false if user is null or undefined', () => {
      expect(hasPermission(null, 'view:audit-plan')).toBe(false);
      expect(hasPermission(undefined, 'view:audit-plan')).toBe(false);
    });

    it('grants full access to admin user by username', () => {
      const adminUser: UserProfile = {
        id: 1,
        username: 'admin',
        role: 'Auditor',
      } as any;
      expect(hasPermission(adminUser, 'admin:access')).toBe(true);
      expect(hasPermission(adminUser, 'plan:approve')).toBe(true);
    });

    it('grants full access to Admin role', () => {
      const adminUser: UserProfile = {
        id: 2,
        username: 'john_admin',
        role: 'Quản trị hệ thống (Admin)',
      } as any;
      expect(hasPermission(adminUser, 'admin:access')).toBe(true);
    });

    it('grants full access to CAE/Lãnh đạo role', () => {
      const caeUser: UserProfile = {
        id: 3,
        username: 'cae_lead',
        role: 'Trưởng Ban KTNB (CAE)',
      } as any;
      expect(hasPermission(caeUser, 'plan:approve')).toBe(true);
      expect(hasPermission(caeUser, 'wp:approve')).toBe(true);
    });

    it('handles auditee permissions restricted by department', () => {
      const auditeeUser: UserProfile = {
        id: 4,
        username: 'auditee_branch1',
        role: 'Đơn vị được kiểm toán (Auditee)',
        department: 'CN_HANOI',
      } as any;

      // Auditee can perform auditee actions within their department
      expect(hasPermission(auditeeUser, 'auditee:feedback', 'CN_HANOI')).toBe(true);
      // But not on other departments
      expect(hasPermission(auditeeUser, 'auditee:feedback', 'CN_DANANG')).toBe(false);
      // Nor standard audit actions
      expect(hasPermission(auditeeUser, 'view:audit-plan')).toBe(false);
    });

    it('allows personal workspace modules regardless of permissions switch', () => {
      const staffUser: UserProfile = {
        id: 5,
        username: 'auditor1',
        role: 'Kiểm toán viên (Auditor)',
        permissions: 'dashboard',
      } as any;

      expect(hasPermission(staffUser, 'view:bsc-kpi')).toBe(true);
      expect(hasPermission(staffUser, 'view:timesheet')).toBe(true);
      expect(hasPermission(staffUser, 'view:training-cpe')).toBe(true);
    });

    it('enforces exclusion of admin pages for regular auditors', () => {
      const staffUser: UserProfile = {
        id: 6,
        username: 'auditor2',
        role: 'Kiểm toán viên (Auditor)',
      } as any;

      expect(hasPermission(staffUser, 'view:roles')).toBe(false);
      expect(hasPermission(staffUser, 'view:personnel')).toBe(false);
      expect(hasPermission(staffUser, 'wp:approve')).toBe(false);
    });

    it('allows team leads to review and approve working papers', () => {
      const teamLead: UserProfile = {
        id: 7,
        username: 'team_lead',
        role: 'Trưởng đoàn kiểm toán (Team Lead)',
      } as any;

      expect(hasPermission(teamLead, 'wp:review')).toBe(true);
      expect(hasPermission(teamLead, 'wp:approve')).toBe(true);
      expect(hasPermission(teamLead, 'admin:access')).toBe(false);
    });
  });
});
