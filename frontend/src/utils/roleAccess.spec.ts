import { describe, it, expect } from 'vitest';
import { hasRouteAccess, groupsForRole, roleAliases, type RoleGroup } from './roleAccess';
import { RBAC_MATRIX, type RoleGroup as MatrixRoleGroup } from '../../e2e/prod/prod-rbac.matrix';

/**
 * HỒI QUY LỖI PHÂN QUYỀN & KIỂM CHỨNG MA TRẬN RBAC (UAT 4.0)
 * ==========================================================
 * Kiểm tra 2 cấp độ:
 *   1. Các ca kiểm thử đơn vị độc lập ngôn ngữ (vi-VN & en-US)
 *   2. Kiểm chứng tự động toàn bộ 16 màn hình x 8 vai trò theo đúng Ma Trận UAT
 */

// Allowlist chuẩn cấu hình trong App.tsx cho các nhóm màn hình
const FINDINGS_ALLOWED = ['admin', 'cae', 'tppp', 'lead', 'ktv', 'caats', 'auditee', 'bks'];
const WORKING_PAPERS_ALLOWED = ['admin', 'cae', 'tppp', 'lead', 'ktv', 'caats'];
const SYSTEM_ADMIN_ALLOWED = ['admin', 'cae'];
const AUDIT_COMMITTEE_ALLOWED = ['admin', 'cae', 'bks'];
const REGULATORY_EXAMS_ALLOWED = ['admin', 'cae', 'tppp', 'bks'];
const AUDITEE_PORTAL_ALLOWED = ['admin', 'cae', 'tppp', 'lead', 'ktv', 'auditee', 'bks'];
const BSC_KPI_ALLOWED = ['admin', 'cae', 'tppp', 'lead', 'ktv', 'caats', 'bks'];

// Bản đồ quyền cho 16 URL màn hình ma trận UAT
const ROUTE_ALLOW_MAP: Record<string, RoleGroup[]> = {
  '/': ['admin', 'cae', 'tppp', 'lead', 'ktv', 'caats', 'auditee', 'bks'],
  '/audit-committee-portal': ['admin', 'cae', 'bks'],
  '/regulatory-exams': ['admin', 'cae', 'tppp', 'bks'],
  '/auditee-portal': ['admin', 'cae', 'tppp', 'lead', 'ktv', 'auditee', 'bks'],
  '/risk-and-planning?step=scope': ['admin', 'cae', 'tppp', 'lead', 'ktv', 'caats', 'bks'],
  '/risk-and-planning?step=plan': ['admin', 'cae', 'tppp', 'lead', 'caats', 'bks'],
  '/audit-engagements': ['admin', 'cae', 'tppp', 'lead', 'ktv', 'caats', 'bks'],
  '/working-papers': ['admin', 'cae', 'tppp', 'lead', 'ktv', 'caats'],
  '/findings-hub': ['admin', 'cae', 'tppp', 'lead', 'ktv', 'caats', 'auditee', 'bks'],
  '/findings-hub?tab=recommendations': ['admin', 'cae', 'tppp', 'lead', 'ktv', 'auditee', 'bks'],
  '/continuous-monitoring': ['admin', 'cae', 'tppp', 'lead', 'ktv', 'caats', 'bks'],
  '/general-tasks': ['admin', 'cae', 'tppp', 'lead', 'ktv', 'caats'],
  '/bsc-kpi': ['admin', 'cae', 'tppp', 'lead', 'ktv', 'caats', 'bks'],
  '/document-manager': ['admin', 'cae', 'tppp', 'lead', 'ktv', 'caats', 'bks'],
  '/regulatory-kb': ['admin', 'cae', 'tppp', 'lead', 'ktv', 'caats', 'auditee', 'bks'],
  '/system-admin': ['admin', 'cae'],
};

// Chuỗi vai trò thực tế tương ứng với 8 nhóm vai trò UAT
const REPRESENTATIVE_ROLES: Record<MatrixRoleGroup, string[]> = {
  admin: ['Admin', 'Quản trị hệ thống'],
  cae: ['Phó Giám đốc Khối kiểm toán nội bộ', 'Trưởng Ban KTNB'],
  tppp: ['Phó phòng kiểm toán hội sở hệ thống', 'Trưởng phòng kiểm toán đơn vị kinh doanh'],
  lead: ['Trưởng đoàn', 'Trưởng đoàn kiểm toán'],
  ktv: ['Kiểm toán viên chính', 'Kiểm toán viên', 'Kiểm toán viên cao cấp'],
  caats: ['Chuyên gia', 'Chuyên gia CAATs'],
  auditee: ['Đơn vị được kiểm toán'],
  bks: ['Trưởng Ban kiểm soát', 'Thành viên Ban kiểm soát'],
};

describe('roleAccess — quyền truy cập độc lập ngôn ngữ & nhóm vai trò chuẩn', () => {
  it('TC-AUTHZ-01: KTV "Kiểm toán viên chính" ĐƯỢC vào /findings-hub', () => {
    expect(hasRouteAccess(FINDINGS_ALLOWED, 'Kiểm toán viên chính')).toBe(true);
  });

  it('TC-AUTHZ-02: KTV "Kiểm toán viên" ĐƯỢC vào /findings-hub', () => {
    expect(hasRouteAccess(FINDINGS_ALLOWED, 'Kiểm toán viên')).toBe(true);
  });

  it('TC-AUTHZ-03: Mọi vai trò hợp lệ đều vào được findings-hub', () => {
    for (const role of [
      'Kiểm toán viên chính',
      'Kiểm toán viên',
      'Kiểm toán viên cao cấp',
      'Trưởng đoàn',
      'Trưởng phòng kiểm toán hội sở hệ thống',
      'Phó Giám đốc Khối kiểm toán nội bộ',
      'Chuyên gia',
      'Đơn vị được kiểm toán',
      'Trưởng Ban kiểm soát',
    ]) {
      expect(hasRouteAccess(FINDINGS_ALLOWED, role), role + ' phải được vào').toBe(true);
    }
  });

  it('TC-AUTHZ-04: Vai trò ngoài phạm vi bị chặn', () => {
    expect(hasRouteAccess(SYSTEM_ADMIN_ALLOWED, 'Đơn vị được kiểm toán')).toBe(false);
    expect(hasRouteAccess(SYSTEM_ADMIN_ALLOWED, 'Kế toán trưởng chi nhánh')).toBe(false);
    expect(hasRouteAccess(SYSTEM_ADMIN_ALLOWED, '')).toBe(false);
  });

  it('TC-AUTHZ-05: Admin luôn có toàn quyền', () => {
    expect(hasRouteAccess(['ktv'], 'Admin')).toBe(true);
    expect(hasRouteAccess(['ktv'], 'Quản trị hệ thống')).toBe(true);
    expect(hasRouteAccess([], 'admin')).toBe(true);
  });

  it('TC-AUTHZ-06: Cổng BKS chỉ cho Admin, CAE, BKS; chặn KTV và TPPP', () => {
    expect(hasRouteAccess(AUDIT_COMMITTEE_ALLOWED, 'Trưởng Ban kiểm soát')).toBe(true);
    expect(hasRouteAccess(AUDIT_COMMITTEE_ALLOWED, 'Phó Giám đốc Khối kiểm toán nội bộ')).toBe(true);
    expect(hasRouteAccess(AUDIT_COMMITTEE_ALLOWED, 'Kiểm toán viên chính')).toBe(false);
    expect(hasRouteAccess(AUDIT_COMMITTEE_ALLOWED, 'Phó phòng kiểm toán hội sở hệ thống')).toBe(false);
  });

  it('TC-AUTHZ-07: Alias gom cả tiếng Việt lẫn tiếng Anh', () => {
    const aliases = roleAliases('resourceCalendar.auditor', 'kiểm toán viên');
    expect(aliases).toContain('kiểm toán viên');
    expect(aliases).toContain('auditor');
  });

  it('TC-AUTHZ-08: Tên vai trò tiếng Anh cũng được nhận diện đúng nhóm', () => {
    expect(groupsForRole('Principal Auditor').has('ktv')).toBe(true);
    expect(groupsForRole('Auditor').has('ktv')).toBe(true);
    expect(groupsForRole('Head of Control Board').has('bks')).toBe(true);
  });

  it('TC-AUTHZ-09: Ban Kiểm soát BỊ CHẶN ở Working Papers & General Tasks', () => {
    expect(hasRouteAccess(WORKING_PAPERS_ALLOWED, 'Trưởng Ban kiểm soát')).toBe(false);
    expect(hasRouteAccess(WORKING_PAPERS_ALLOWED, 'Thành viên Ban kiểm soát')).toBe(false);
    // KTV và Lãnh đạo Khối vẫn được vào bình thường
    expect(hasRouteAccess(WORKING_PAPERS_ALLOWED, 'Kiểm toán viên chính')).toBe(true);
    expect(hasRouteAccess(WORKING_PAPERS_ALLOWED, 'Phó Giám đốc Khối kiểm toán nội bộ')).toBe(true);
  });

  it('TC-AUTHZ-10: Quản trị hệ thống (/system-admin) CHỈ cho Admin và Lãnh đạo Khối CAE', () => {
    expect(hasRouteAccess(SYSTEM_ADMIN_ALLOWED, 'Admin')).toBe(true);
    expect(hasRouteAccess(SYSTEM_ADMIN_ALLOWED, 'Phó Giám đốc Khối kiểm toán nội bộ')).toBe(true);
    // Chặn toàn bộ các vai trò khác theo đúng Ma trận UAT màn 16
    expect(hasRouteAccess(SYSTEM_ADMIN_ALLOWED, 'Kiểm toán viên')).toBe(false);
    expect(hasRouteAccess(SYSTEM_ADMIN_ALLOWED, 'Kiểm toán viên cao cấp')).toBe(false);
    expect(hasRouteAccess(SYSTEM_ADMIN_ALLOWED, 'Trưởng đoàn')).toBe(false);
    expect(hasRouteAccess(SYSTEM_ADMIN_ALLOWED, 'Phó phòng kiểm toán hội sở hệ thống')).toBe(false);
    expect(hasRouteAccess(SYSTEM_ADMIN_ALLOWED, 'Chuyên gia')).toBe(false);
    expect(hasRouteAccess(SYSTEM_ADMIN_ALLOWED, 'Trưởng Ban kiểm soát')).toBe(false);
  });

  it('TC-AUTHZ-11: Giám sát đoàn thanh tra NHNN (/regulatory-exams) cho phép TPPP và BKS', () => {
    expect(hasRouteAccess(REGULATORY_EXAMS_ALLOWED, 'Phó phòng kiểm toán hội sở hệ thống')).toBe(true);
    expect(hasRouteAccess(REGULATORY_EXAMS_ALLOWED, 'Trưởng Ban kiểm soát')).toBe(true);
    expect(hasRouteAccess(REGULATORY_EXAMS_ALLOWED, 'Kiểm toán viên chính')).toBe(false);
    expect(hasRouteAccess(REGULATORY_EXAMS_ALLOWED, 'Chuyên gia')).toBe(false);
  });

  it('TC-AUTHZ-12: Cổng Auditee chặn CAATs, BSC-KPI chặn Auditee', () => {
    expect(hasRouteAccess(AUDITEE_PORTAL_ALLOWED, 'Đơn vị được kiểm toán')).toBe(true);
    expect(hasRouteAccess(AUDITEE_PORTAL_ALLOWED, 'Chuyên gia')).toBe(false);

    expect(hasRouteAccess(BSC_KPI_ALLOWED, 'Kiểm toán viên')).toBe(true);
    expect(hasRouteAccess(BSC_KPI_ALLOWED, 'Đơn vị được kiểm toán')).toBe(false);
  });
});

describe('P2-1: Tự động đối chiếu 16 Màn hình x 8 Vai trò với Ma trận UAT 4.0', () => {
  for (const row of RBAC_MATRIX) {
    const allowedGroups = ROUTE_ALLOW_MAP[row.url];
    if (!allowedGroups) {
      throw new Error(`Chưa định cấu hình allowlist cho màn ${row.stt}: ${row.url}`);
    }

    for (const [groupKey, roleNames] of Object.entries(REPRESENTATIVE_ROLES) as Array<[MatrixRoleGroup, string[]]>) {
      const expected = row.exp[groupKey].allowed;
      const matrixLabel = row.exp[groupKey].label;

      it(`Màn ${row.stt} [${row.name}] (${row.url}) — Vai trò: ${groupKey} (${matrixLabel})`, () => {
        for (const roleName of roleNames) {
          const actual = hasRouteAccess(allowedGroups, roleName);
          expect(
            actual,
            `Màn ${row.stt} ${row.url} với vai trò "${roleName}" (${groupKey}): kỳ vọng ${expected ? 'CHO PHÉP' : 'CHẶN'} nhưng thực tế là ${actual ? 'CHO PHÉP' : 'CHẶN'}`
          ).toBe(expected);
        }
      });
    }
  }
});
