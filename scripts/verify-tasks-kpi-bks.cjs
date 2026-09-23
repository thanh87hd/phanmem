/**
 * Verification Script: Tasks, BSC-KPI, and BKS Portal Integration
 */

const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('🔍 VERIFYING TASKS, BSC-KPI & BKS PORTAL INTEGRATION');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

const rootDir = path.resolve(__dirname, '..');
const appTsxPath = path.join(rootDir, 'frontend', 'src', 'App.tsx');
const mainLayoutPath = path.join(rootDir, 'frontend', 'src', 'layout', 'MainLayout.tsx');
const generalTasksPath = path.join(rootDir, 'frontend', 'src', 'pages', 'GeneralTasks.tsx');
const dashboardPath = path.join(rootDir, 'frontend', 'src', 'pages', 'Dashboard.tsx');
const auditCommitteePortalPath = path.join(rootDir, 'frontend', 'src', 'pages', 'AuditCommitteePortal.tsx');
const bscKpiPath = path.join(rootDir, 'frontend', 'src', 'pages', 'BscKpi.tsx');

// 1. Check File Exists
console.log('--- 1. Checking Core Files Existence ---');
assert(fs.existsSync(appTsxPath), 'App.tsx exists');
assert(fs.existsSync(mainLayoutPath), 'MainLayout.tsx exists');
assert(fs.existsSync(generalTasksPath), 'GeneralTasks.tsx exists');
assert(fs.existsSync(dashboardPath), 'Dashboard.tsx exists');
assert(fs.existsSync(auditCommitteePortalPath), 'AuditCommitteePortal.tsx exists');
assert(fs.existsSync(bscKpiPath), 'BscKpi.tsx exists');

// 2. Check App.tsx routing
console.log('\n--- 2. Checking App.tsx Routing ---');
const appContent = fs.readFileSync(appTsxPath, 'utf8');
assert(appContent.includes('path="audit-committee-portal"'), 'Route audit-committee-portal is registered in App.tsx');
assert(appContent.includes('path="audit-committee"'), 'Route audit-committee is registered in App.tsx');
assert(appContent.includes('path="general-tasks"'), 'Route general-tasks is registered in App.tsx');
assert(appContent.includes('path="bsc-kpi"'), 'Route bsc-kpi is registered in App.tsx');
assert(appContent.includes('Ban kiểm soát') || appContent.includes('Ban Kiểm soát'), 'Ban kiểm soát role allowed in ProtectedRoute');

// 3. Check MainLayout.tsx Sidebar Menu & Roles
console.log('\n--- 3. Checking MainLayout.tsx Menu & Permissions ---');
const layoutContent = fs.readFileSync(mainLayoutPath, 'utf8');
assert(layoutContent.includes("key: '/audit-committee-portal'"), 'MainLayout has menu item /audit-committee-portal');
assert(layoutContent.includes("key: '/general-tasks'"), 'MainLayout has menu item /general-tasks');
assert(layoutContent.includes("key: '/bsc-kpi'"), 'MainLayout has menu item /bsc-kpi');
assert(layoutContent.includes('BankOutlined'), 'BankOutlined icon imported and used in MainLayout');
assert(layoutContent.includes('ScheduleOutlined'), 'ScheduleOutlined icon imported and used in MainLayout');
assert(layoutContent.includes('TrophyOutlined'), 'TrophyOutlined icon imported and used in MainLayout');
assert(layoutContent.includes("cleanKey.includes('general-tasks')"), 'general-tasks added to isAlwaysAllowedPage whitelist');
assert(layoutContent.includes("cleanKey.includes('bsc-kpi')"), 'bsc-kpi added to isAlwaysAllowedPage whitelist');
assert(layoutContent.includes("cleanKey.includes('audit-committee')"), 'audit-committee added to isAlwaysAllowedPage whitelist');

// 4. Check GeneralTasks.tsx Progress by Department and Personnel
console.log('\n--- 4. Checking GeneralTasks.tsx Progress Analytics & Tabs ---');
const tasksContent = fs.readFileSync(generalTasksPath, 'utf8');
assert(tasksContent.includes('departmentStats'), 'departmentStats calculated in GeneralTasks.tsx');
assert(tasksContent.includes('personnelStats'), 'personnelStats calculated in GeneralTasks.tsx');
assert(tasksContent.includes('deptColumns'), 'deptColumns defined in GeneralTasks.tsx');
assert(tasksContent.includes('personnelColumns'), 'personnelColumns defined in GeneralTasks.tsx');
assert(tasksContent.includes("key: 'progress'"), 'Progress tab configured in GeneralTasks.tsx');
assert(tasksContent.includes("key: 'list'"), 'List tab configured in GeneralTasks.tsx');
assert(tasksContent.includes('<Progress'), 'Ant Design Progress bar embedded in GeneralTasks.tsx');

// 5. Check Dashboard.tsx Shortcuts and Selector
console.log('\n--- 5. Checking Dashboard.tsx Quick Actions ---');
const dashContent = fs.readFileSync(dashboardPath, 'utf8');
assert(dashContent.includes('/audit-committee-portal'), 'Dashboard includes /audit-committee-portal shortcut');
assert(dashContent.includes('/bsc-kpi'), 'Dashboard includes /bsc-kpi shortcut');
assert(dashContent.includes('/general-tasks'), 'Dashboard includes /general-tasks shortcut');
assert(dashContent.includes('Cổng BKS'), 'Dashboard includes Cổng BKS quick link button');

console.log('\n====================================================');
console.log(`🏁 VERIFICATION COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
}
