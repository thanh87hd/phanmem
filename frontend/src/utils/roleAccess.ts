import vi from '../i18n/locales/vi.json';
import en from '../i18n/locales/en.json';

/**
 * SO KHỚP VAI TRÒ ĐỘC LẬP NGÔN NGỮ & MA TRẬN PHÂN QUYỀN RBAC (UAT 4.0)
 * =====================================================================
 * 8 nhóm vai trò chuẩn theo tài liệu UAT (docs/04_Kich_Ban_Kiem_Thu_UAT_KTNB_4.0.md):
 *   1. admin   : Quản trị hệ thống (Admin)
 *   2. cae     : Lãnh đạo Khối KTNB (CAE / Trưởng Ban KTNB)
 *   3. tppp    : Lãnh đạo Phòng (Trưởng phòng / Phó phòng KTNB)
 *   4. lead    : Trưởng đoàn kiểm toán (Lead Auditor)
 *   5. ktv     : Kiểm toán viên thành viên (Auditor)
 *   6. caats   : Chuyên gia phân tích dữ liệu & giám sát liên tục (CAATs Expert)
 *   7. auditee : Đơn vị được kiểm toán (Auditee)
 *   8. bks     : Ban Kiểm soát (Supervisory Board)
 */

export type RoleGroup = 'admin' | 'cae' | 'tppp' | 'lead' | 'ktv' | 'caats' | 'auditee' | 'bks';
export type LegacyRoleGroup = 'lanhDao' | 'truongDoan';

/** Đọc giá trị lồng nhau theo đường dẫn "a.b.c". */
function readPath(obj: unknown, path: string): string | undefined {
  const v = path.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[k];
    return undefined;
  }, obj);
  return typeof v === 'string' ? v : undefined;
}

/**
 * Trả về MỌI cách viết của một vai trò: bản dịch tiếng Việt, tiếng Anh và
 * chuỗi dự phòng. Nhờ vậy phép so khớp không phụ thuộc ngôn ngữ đang chọn.
 */
export function roleAliases(key: string, fallback: string): string[] {
  const out = new Set<string>();
  for (const dict of [vi, en] as unknown[]) {
    const v = readPath(dict, key);
    if (v && v.trim()) out.add(v.trim().toLowerCase());
  }
  out.add(fallback.trim().toLowerCase());
  return [...out];
}

/** Gộp alias của nhiều khóa i18n thành một tập hợp. */
function aliasesOf(...pairs: Array<[string, string]>): string[] {
  const out = new Set<string>();
  for (const [key, fallback] of pairs) {
    for (const a of roleAliases(key, fallback)) out.add(a);
  }
  return [...out];
}

// ── Các nhóm vai trò, gom alias của CẢ tiếng Việt lẫn tiếng Anh ──────────────
export const GROUP_ALIASES: Record<RoleGroup, string[]> = {
  // 1. Quản trị hệ thống
  admin: aliasesOf(
    ['auditTemplates.administration', 'quản trị'],
    ['protectedRoute.systemAdministrator', 'quản trị hệ thống'],
  ).concat(['admin', 'administrator', 'quản trị viên', 'quản trị hệ thống', 'quản trị']),

  // 2. Lãnh đạo Khối KTNB (CAE / Trưởng Ban KTNB)
  cae: aliasesOf(
    ['auditTemplates.headOfInternalAuditCommittee', 'trưởng ban ktnb'],
    ['auditTemplates.ktnbLeader', 'lãnh đạo ktnb'],
    ['protectedRoute.directorOfInternalAuditDepartment', 'giám đốc khối kiểm toán nội bộ'],
    ['protectedRoute.deputyDirectorOfInternalAuditDepartment', 'phó giám đốc khối kiểm toán nội bộ'],
  ).concat([
    'cae',
    'trưởng ban ktnb',
    'lãnh đạo ktnb',
    'giám đốc khối kiểm toán nội bộ',
    'phó giám đốc khối kiểm toán nội bộ',
    'giám đốc khối ktnb',
    'phó giám đốc khối ktnb',
    'lãnh đạo khối ktnb',
  ]),

  // 3. Lãnh đạo Phòng (Trưởng phòng / Phó phòng)
  tppp: aliasesOf(
    ['protectedRoute.headOfSystemHeadquartersAuditDepartment', 'trưởng phòng kiểm toán hội sở hệ thống'],
    ['protectedRoute.headOfBusinessUnitAuditDepartment', 'trưởng phòng kiểm toán đơn vị kinh doanh'],
    ['protectedRoute.deputyHeadOfAuditDepartmentOf', 'phó phòng kiểm toán hội sở hệ thống'],
    ['protectedRoute.deputyHeadOfBusinessUnitAudit', 'phó phòng kiểm toán đơn vị kinh doanh'],
  ).concat([
    'trưởng phòng kiểm toán hội sở hệ thống',
    'trưởng phòng kiểm toán đơn vị kinh doanh',
    'phó phòng kiểm toán hội sở hệ thống',
    'phó phòng kiểm toán đơn vị kinh doanh',
    'trưởng phòng',
    'phó phòng',
    'lãnh đạo phòng',
    'tppp',
    'tp/pp',
  ]),

  // 4. Trưởng đoàn kiểm toán
  lead: aliasesOf(
    ['auditTemplates.delegationLeader', 'trưởng đoàn'],
    ['protectedRoute.auditTeamLeader', 'trưởng đoàn kiểm toán'],
    ['protectedRoute.deputyHeadOfTheAuditTeam', 'phó trưởng đoàn kiểm toán'],
    ['protectedRoute.unionSecretary', 'thư ký đoàn'],
  ).concat([
    'trưởng đoàn',
    'trưởng đoàn kiểm toán',
    'phó trưởng đoàn kiểm toán',
    'trưởng nhóm kiểm toán',
    'thư ký đoàn',
    'lead',
    'audit team leader',
  ]),

  // 5. Kiểm toán viên thành viên
  ktv: aliasesOf(
    ['resourceCalendar.auditor', 'kiểm toán viên'],
    ['protectedRoute.principalAuditor', 'kiểm toán viên chính'],
    ['protectedRoute.seniorAuditor', 'kiểm toán viên cao cấp'],
    ['resourceCalendar.member', 'thành viên'],
  ).concat([
    'kiểm toán viên',
    'kiểm toán viên chính',
    'kiểm toán viên cao cấp',
    'thành viên',
    'auditor',
    'principal auditor',
    'senior auditor',
    'ktv',
  ]),

  // 6. Chuyên gia CAATs
  caats: aliasesOf(
    ['protectedRoute.expert', 'chuyên gia'],
  ).concat([
    'chuyên gia',
    'chuyên gia caats',
    'chuyên viên caats',
    'caats',
    'expert',
  ]),

  // 7. Đơn vị được kiểm toán
  auditee: aliasesOf(
    ['auditeePortal.auditeePortal', 'cổng đơn vị được kiểm toán'],
  ).concat([
    'đơn vị được kiểm toán',
    'đơn vị kiểm toán',
    'auditee',
    'đơn vị',
  ]),

  // 8. Ban kiểm soát
  // ⚠️ TUYỆT ĐỐI KHÔNG thêm 'trưởng ban ktnb' vào nhóm này.
  // Trong allowlist, chuỗi 'Trưởng Ban KTNB' là viết tắt của LÃNH ĐẠO KHỐI KTNB.
  bks: aliasesOf(
    ['protectedRoute.controlBoard', 'ban kiểm soát'],
    ['protectedRoute.headOfControlBoard', 'trưởng ban kiểm soát'],
    ['protectedRoute.deputyHeadOfControlBoard', 'phó trưởng ban kiểm soát'],
    ['protectedRoute.memberOfTheSupervisoryBoard', 'thành viên ban kiểm soát'],
  ).concat([
    'ban kiểm soát',
    'trưởng ban kiểm soát',
    'phó trưởng ban kiểm soát',
    'thành viên ban kiểm soát',
    'bks',
    'control board',
  ]),
};

const normalize = (s: string): string => s.trim().toLowerCase();

/** Bản đồ ánh xạ tên nhóm cũ sang nhóm chuẩn mới (hỗ trợ tương thích ngược) */
const LEGACY_GROUP_MAP: Record<string, RoleGroup> = {
  lanhdao: 'cae',
  truongdoan: 'lead',
};

/** Các nhóm mà một chuỗi vai trò thuộc về. */
export function groupsForRole(role: string): Set<RoleGroup> {
  const r = normalize(role || '');
  const out = new Set<RoleGroup>();
  if (!r) return out;

  // Kiểm tra trực tiếp tên token nhóm
  if (r in GROUP_ALIASES) {
    out.add(r as RoleGroup);
  }
  if (r in LEGACY_GROUP_MAP) {
    out.add(LEGACY_GROUP_MAP[r]);
  }

  // Khớp theo alias định nghĩa
  for (const g of Object.keys(GROUP_ALIASES) as RoleGroup[]) {
    if (GROUP_ALIASES[g].includes(r)) out.add(g);
  }

  // Khớp tiền tố/từ khóa cho Quản trị viên
  if (r.includes('admin') || r.includes('quản trị') || GROUP_ALIASES.admin.includes(r)) {
    out.add('admin');
  }

  return out;
}

/** Các nhóm mà danh sách allowedRoles / allowGroups đại diện. */
export function groupsForAllowed(allowedRoles: (RoleGroup | LegacyRoleGroup | string)[]): Set<RoleGroup> {
  const out = new Set<RoleGroup>();
  for (const item of allowedRoles || []) {
    const r = normalize(String(item));
    if (r in GROUP_ALIASES) {
      out.add(r as RoleGroup);
      continue;
    }
    if (r in LEGACY_GROUP_MAP) {
      out.add(LEGACY_GROUP_MAP[r]);
      continue;
    }
    for (const g of groupsForRole(String(item))) {
      out.add(g);
    }
  }
  return out;
}

/**
 * Quyết định quyền truy cập route.
 * Hoàn toàn độc lập với ngôn ngữ giao diện (vi/en).
 * Kiểm tra đối chiếu tường minh theo allowlist nhóm vai trò (bỏ cơ chế kế thừa cũ gây rò rỉ).
 */
export function hasRouteAccess(
  allowed: (RoleGroup | LegacyRoleGroup | string)[],
  userRole: string,
): boolean {
  const userGroups = groupsForRole(userRole);
  // Admin luôn có toàn quyền truy cập
  if (userGroups.has('admin')) return true;

  const allowedGroups = groupsForAllowed(allowed);

  // Khớp chuỗi trực tiếp (bảo toàn tương thích chuỗi allowlist cũ)
  const usr = normalize(userRole || '');
  if ((allowed || []).map((x) => normalize(String(x))).includes(usr)) return true;

  // Hỗ trợ quan hệ thứ bậc nghiệp vụ: Trưởng đoàn và Lãnh đạo Khối có quyền bao hàm cấp KTV
  const expand = (g: RoleGroup): RoleGroup[] => {
    if (g === 'ktv') return ['ktv', 'lead', 'cae'];
    if (g === 'lead') return ['lead', 'cae'];
    return [g];
  };

  // So khớp nhóm người dùng với danh sách nhóm được phép
  for (const g of allowedGroups) {
    for (const implied of expand(g)) {
      if (userGroups.has(implied)) return true;
    }
  }

  return false;
}
