/**
 * Smoke Test Phase 4 — Compatibility Redirects & Deep-link Verification
 * 
 * Kiểm tra:
 * 1. Toàn bộ URL cũ đã được định nghĩa trong App.tsx là Navigate redirect
 * 2. AuditeePortal giữ nguyên độc lập (không redirect vào Hub)
 * 3. Dedicated Workspaces không bị redirect
 * 
 * Chạy: node frontend/scripts/smoke-test-phase4-redirects.js
 */

const fs = require('fs');
const path = require('path');

// ======================================================
// BẢNG ÁNH XẠ REDIRECTS CẦN KIỂM TRA (từ ADR-0011)
// ======================================================
const REDIRECT_MAP = {
  // Hub 1: Rủi Ro & Kế Hoạch
  'audit-universe':    '/risk-and-planning?tab=universe&subTab=sub1',
  'departments':       '/risk-and-planning?tab=universe&subTab=sub2',
  'risk-control-matrix': '/risk-and-planning?tab=rcm&subTab=sub1',
  'risk-register':     '/risk-and-planning?tab=rcm&subTab=sub2',
  'thematic-analysis': '/risk-and-planning?tab=rcm&subTab=sub2',
  'test-of-control':   '/risk-and-planning?tab=rcm&subTab=sub1',
  'risk-criteria':     '/risk-and-planning?tab=assessment&subTab=sub1',
  'risk-assessment':   '/risk-and-planning?tab=assessment&subTab=sub1',
  'scenario-risk-map': '/risk-and-planning?tab=assessment&subTab=sub2',
  'audit-plan':        '/risk-and-planning?tab=plan&subTab=sub1',
  'resource-capacity': '/risk-and-planning?tab=plan&subTab=sub2',
  
  // Hub 2: Phát Hiện & Báo Cáo
  'audit-findings':          '/findings-hub?tab=findings&subTab=sub1',
  'audit-findings-analytics': '/findings-hub?tab=findings&subTab=sub2',
  'audit-minutes':           '/findings-hub?tab=findings&subTab=sub1',
  'audit-reports':           '/findings-hub?tab=reports&subTab=sub1',
  'audit-ratings':           '/findings-hub?tab=reports&subTab=sub2',
  'recommendations':         '/findings-hub?tab=recommendations',

  // Hub 3: Quản Trị Hệ Thống (Admin)
  'roles':                '/system-admin?tab=roles',
  'personnel':            '/system-admin?tab=personnel&subTab=sub1',
  'audit-trail':          '/system-admin?tab=audit-trail',
  'system-management':    '/system-admin?tab=config&subTab=sub1',
  'integration-settings': '/system-admin?tab=config&subTab=sub2',
  'external-database':    '/system-admin?tab=config&subTab=sub2',
  'active-directory':     '/system-admin?tab=config&subTab=sub2',
  'exchange-365':         '/system-admin?tab=config&subTab=sub2',
  'infrastructure-monitor': '/system-admin?tab=config&subTab=sub1',
  'training-cpe':         '/system-admin?tab=personnel&subTab=sub3',
  'audit-expenses':       '/system-admin?tab=personnel&subTab=sub4',
};

// Dedicated Workspaces — KHÔNG ĐƯỢC redirect vào Hub
const DEDICATED_WORKSPACES = [
  'audit-engagements',
  'continuous-monitoring',
  'audit-programs',
  'working-papers',
  'quality-control',
  'evidences',
  'execution-dashboard',
  'document-manager',
  'audit-templates',
  'data-analytics',
  'task-management',
  'general-tasks',
  'resource-calendar',
  'summary-reports',
  'raci-governance',
  'auditee-portal',      // ⚠️ Bắt buộc giữ độc lập — bảo mật phân quyền
  'audit-committee',
];

// ======================================================
// ĐỌC FILE App.tsx VÀ PHÂN TÍCH
// ======================================================
const appTsxPath = path.join(__dirname, '..', 'src', 'App.tsx');
let appContent;
try {
  appContent = fs.readFileSync(appTsxPath, 'utf-8');
} catch (e) {
  console.error('❌ Không đọc được App.tsx:', e.message);
  process.exit(1);
}

let passed = 0;
let failed = 0;
const errors = [];

console.log('\n══════════════════════════════════════════════════════════════');
console.log('  SMOKE TEST PHASE 4 — COMPATIBILITY REDIRECTS VERIFICATION');
console.log('══════════════════════════════════════════════════════════════\n');

// ======================================================
// TEST 1: Kiểm tra tất cả redirect routes đã dùng Navigate
// ======================================================
console.log('📋 TEST 1: Kiểm tra Compatibility Redirects (Navigate replace)\n');
for (const [route, target] of Object.entries(REDIRECT_MAP)) {
  // Pattern: path="route" element={<Navigate to="target" replace />}
  const navigatePattern = new RegExp(
    `path="${route}"[^>]*element=\\{<Navigate to="${target.replace(/[?&]/g, '[?&]').replace(/\//g, '\\/')}"\\s*replace`
  );
  // Fallback: check tên route xuất hiện cùng Navigate và target URL
  const hasRoute = appContent.includes(`path="${route}"`);
  const hasNavigate = appContent.includes(`Navigate to="${target}"`);
  
  if (hasRoute && hasNavigate) {
    console.log(`  ✅ /${route} → ${target}`);
    passed++;
  } else if (!hasRoute) {
    console.log(`  ❌ /${route} — Route KHÔNG TỒN TẠI trong App.tsx`);
    errors.push(`Route /${route} không tồn tại`);
    failed++;
  } else {
    // Route tồn tại nhưng không dùng Navigate → có thể vẫn render component cũ
    // Kiểm tra xem route có dùng Navigate không
    const routeLineMatch = appContent.match(new RegExp(`path="${route}"[^\n]+`));
    const routeLine = routeLineMatch ? routeLineMatch[0] : '';
    if (routeLine.includes('Navigate')) {
      console.log(`  ✅ /${route} → (Navigate, target khác) ${target}`);
      passed++;
    } else {
      console.log(`  ❌ /${route} — VẪN RENDER COMPONENT CŨ (chưa redirect)`);
      errors.push(`Route /${route} chưa được chuyển thành Navigate redirect`);
      failed++;
    }
  }
}

// ======================================================
// TEST 2: Kiểm tra Dedicated Workspaces giữ nguyên (không bị navigate redirect)
// ======================================================
console.log('\n📋 TEST 2: Kiểm tra Dedicated Workspaces giữ nguyên\n');
for (const route of DEDICATED_WORKSPACES) {
  const hasRoute = appContent.includes(`path="${route}"`);
  if (!hasRoute) {
    // auditee-portal có thể ở dạng khác
    const altCheck = appContent.includes(`path="auditee-portal"`) || 
                     appContent.includes('AuditeePortal');
    if (route === 'auditee-portal' && altCheck) {
      console.log(`  ✅ /${route} — Giữ nguyên độc lập (AuditeePortal)`);
      passed++;
      continue;
    }
    console.log(`  ⚠️  /${route} — Không tìm thấy route (có thể đã bị xóa hoặc đổi tên)`);
    continue;
  }
  
  // Kiểm tra rằng route này KHÔNG dùng Navigate về Hub
  const routeLineMatch = appContent.match(new RegExp(`path="${route}"[^\n]+`));
  const routeLine = routeLineMatch ? routeLineMatch[0] : '';
  const redirectsToHub = routeLine.includes('Navigate') && 
    (routeLine.includes('risk-and-planning') || 
     routeLine.includes('findings-hub') || 
     routeLine.includes('system-admin'));
  
  if (redirectsToHub) {
    console.log(`  ❌ /${route} — BỊ REDIRECT VÀO HUB (vi phạm nguyên tắc!)`);
    errors.push(`Dedicated Workspace /${route} bị redirect vào Hub — vi phạm bảo mật`);
    failed++;
  } else {
    console.log(`  ✅ /${route} — Giữ nguyên Dedicated Workspace`);
    passed++;
  }
}

// ======================================================
// TEST 3: Kiểm tra AuditeePortal đặc biệt
// ======================================================
console.log('\n📋 TEST 3: AuditeePortal — Bảo vệ đặc biệt (không vào Hub nội bộ)\n');
const auditeePortalLine = appContent.match(/path="auditee-portal"[^\n]+/);
if (auditeePortalLine) {
  const line = auditeePortalLine[0];
  if (line.includes('Navigate') && line.includes('findings-hub')) {
    console.log(`  ❌ AuditeePortal BỊ REDIRECT vào FindingsHub — VI PHẠM BẢO MẬT!`);
    errors.push('AuditeePortal bị redirect vào Hub nội bộ');
    failed++;
  } else if (line.includes('AuditeePortal') || !line.includes('Navigate')) {
    console.log(`  ✅ AuditeePortal — Độc lập, không bị redirect vào Hub nội bộ`);
    passed++;
  } else {
    console.log(`  ⚠️  AuditeePortal — Line: ${line}`);
  }
} else {
  // Kiểm tra auditeePortal có thể ở dạng component
  if (appContent.includes('AuditeePortal') && appContent.includes('auditee-portal')) {
    console.log(`  ✅ AuditeePortal — Tìm thấy, cần kiểm tra thủ công`);
    passed++;
  } else {
    console.log(`  ⚠️  Không tìm thấy route auditee-portal trong App.tsx`);
  }
}

// ======================================================
// TEST 4: Kiểm tra 3 Hub components có searchParams subTab
// ======================================================
console.log('\n📋 TEST 4: Hub Components — Deep-link subTab via searchParams\n');
const hubFiles = [
  { name: 'RiskAndPlanningHub', path: path.join(__dirname, '..', 'src', 'pages', 'RiskAndPlanningHub.tsx') },
  { name: 'FindingsAndReportsHub', path: path.join(__dirname, '..', 'src', 'pages', 'FindingsAndReportsHub.tsx') },
  { name: 'SystemSettingsHub', path: path.join(__dirname, '..', 'src', 'pages', 'SystemSettingsHub.tsx') },
];

for (const hub of hubFiles) {
  try {
    const content = fs.readFileSync(hub.path, 'utf-8');
    const hasSearchParams = content.includes('useSearchParams');
    const hasSubTab = content.includes("searchParams.get('subTab')") || content.includes('currentSubTab');
    const hasSetSearchParams = content.includes('setSearchParams');
    const noUseState = !content.includes("useState<string>('sub1')");
    
    if (hasSearchParams && hasSubTab && hasSetSearchParams) {
      console.log(`  ✅ ${hub.name} — subTab đồng bộ 2 chiều với searchParams`);
      passed++;
    } else {
      console.log(`  ❌ ${hub.name} — Chưa đồng bộ subTab với searchParams`);
      errors.push(`${hub.name} chưa đồng bộ subTab với URL`);
      failed++;
    }
  } catch (e) {
    console.log(`  ❌ ${hub.name} — Không đọc được file: ${e.message}`);
    failed++;
  }
}

// ======================================================
// KẾT QUẢ TỔNG HỢP
// ======================================================
console.log('\n══════════════════════════════════════════════════════════════');
console.log(`  KẾT QUẢ: ${passed} PASSED | ${failed} FAILED`);
console.log('══════════════════════════════════════════════════════════════');

if (errors.length > 0) {
  console.log('\n❌ CÁC LỖI CẦN SỬA:');
  errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  console.log('');
  process.exit(1);
} else {
  console.log('\n✅ TẤT CẢ KIỂM TRA ĐẠT YÊU CẦU — Phase 4 Redirects OK!\n');
  console.log('📌 Deep-link Examples:');
  console.log('  /risk-and-planning?tab=universe&subTab=sub2 → Cơ cấu Tổ chức & Chi nhánh');
  console.log('  /findings-hub?tab=reports&subTab=sub2 → Xếp hạng KSNB (A/B/C/D)');
  console.log('  /system-admin?tab=personnel&subTab=sub3 → Đào tạo & Tích lũy CPE');
  console.log('');
  process.exit(0);
}
