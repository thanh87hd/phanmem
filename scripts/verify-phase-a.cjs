/**
 * Verification Script for Phase A: Structural Alignment & Task Consolidation
 * Validates domain boundaries, facade delegations, dead code removal, and clean TypeScript compilation.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('====================================================');
console.log('🔍 CHECKING PHASE A: STRUCTURAL ALIGNMENT & CONSOLIDATION');
console.log('====================================================\n');

let failed = false;

function check(title, fn) {
  try {
    const res = fn();
    if (res === true || res === undefined) {
      console.log(`✅ [PASS] ${title}`);
    } else {
      console.error(`❌ [FAIL] ${title}: ${res}`);
      failed = true;
    }
  } catch (err) {
    console.error(`❌ [FAIL] ${title}: ${err.message}`);
    failed = true;
  }
}

const rootDir = path.resolve(__dirname, '..');

// 1. Check dead code removed
check('frontend/src/pages/DynamicPage.tsx has been removed', () => {
  const dynamicPagePath = path.join(rootDir, 'frontend', 'src', 'pages', 'DynamicPage.tsx');
  if (fs.existsSync(dynamicPagePath)) return 'DynamicPage.tsx still exists on disk!';
});

// 2. Check Task entity enhancements
check('Task entity has sourceType, engagement, and assignedTo alias', () => {
  const taskEntityPath = path.join(rootDir, 'backend', 'src', 'tasks', 'entities', 'task.entity.ts');
  const content = fs.readFileSync(taskEntityPath, 'utf8');
  if (!content.includes('sourceType: string')) return 'Missing sourceType column in Task entity';
  if (!content.includes('engagement?: AuditEngagement')) return 'Missing engagement relation in Task entity';
  if (!content.includes('get assignedTo()')) return 'Missing assignedTo getter in Task entity';
});

// 3. Check TasksService supports audit & general filtering
check('TasksService supports unified querying with scope filters', () => {
  const tasksServicePath = path.join(rootDir, 'backend', 'src', 'tasks', 'tasks.service.ts');
  const content = fs.readFileSync(tasksServicePath, 'utf8');
  if (!content.includes("sourceType === 'Audit'")) return 'Missing Audit scope filter in TasksService';
  if (!content.includes("sourceType === 'General'")) return 'Missing General scope filter in TasksService';
});

// 4. Check AuditTasksService compatibility facade
check('AuditTasksService delegates to TasksService as a facade', () => {
  const auditTasksServicePath = path.join(rootDir, 'backend', 'src', 'audit-tasks', 'audit-tasks.service.ts');
  const content = fs.readFileSync(auditTasksServicePath, 'utf8');
  if (!content.includes('tasksService: TasksService')) return 'AuditTasksService does not inject TasksService';
  if (!content.includes("sourceType: 'Audit'")) return 'AuditTasksService does not delegate with sourceType: Audit';
});

// 5. Check GeneralTasksService compatibility facade
check('GeneralTasksService delegates to TasksService as a facade', () => {
  const generalTasksServicePath = path.join(rootDir, 'backend', 'src', 'general-tasks', 'general-tasks.service.ts');
  const content = fs.readFileSync(generalTasksServicePath, 'utf8');
  if (!content.includes('tasksService: TasksService')) return 'GeneralTasksService does not inject TasksService';
  if (!content.includes("sourceType: 'General'")) return 'GeneralTasksService does not delegate with sourceType: General';
});

// 6. Check ReportsController routes
check('ReportsController supports report-definitions and reports routes', () => {
  const reportsCtrlPath = path.join(rootDir, 'backend', 'src', 'reports', 'reports.controller.ts');
  const content = fs.readFileSync(reportsCtrlPath, 'utf8');
  if (!content.includes("'report-definitions'") || !content.includes("'reports'")) {
    return 'ReportsController missing dual route support';
  }
});

// 7. Check DynamicWorkflowsController routes
check('DynamicWorkflowsController supports automation-flows and dynamic-workflows', () => {
  const wfCtrlPath = path.join(rootDir, 'backend', 'src', 'dynamic-workflows', 'dynamic-workflows.controller.ts');
  const content = fs.readFileSync(wfCtrlPath, 'utf8');
  if (!content.includes("'automation-flows'") || !content.includes("'dynamic-workflows'")) {
    return 'DynamicWorkflowsController missing dual route support';
  }
});

// 8. Check migration file exists
check('ConsolidateTasksAndAuditGeneralTasks migration exists', () => {
  const migrationPath = path.join(
    rootDir,
    'backend',
    'src',
    'database',
    'migrations',
    '1787831000000-ConsolidateTasksAndAuditGeneralTasks.ts'
  );
  if (!fs.existsSync(migrationPath)) return 'Migration file does not exist';
});

// 9. Check TypeScript compilation passes
check('Backend TypeScript compilation passes with zero errors', () => {
  const output = execSync('node ./node_modules/typescript/bin/tsc -p tsconfig.build.json --noEmit', {
    cwd: path.join(rootDir, 'backend'),
    encoding: 'utf8',
  });
});

console.log('\n====================================================');
if (failed) {
  console.error('🚨 PHASE A VERIFICATION FAILED!');
  process.exit(1);
} else {
  console.log('🎉 PHASE A VERIFICATION PASSED: All 9 checks passed cleanly!');
  console.log('====================================================');
  process.exit(0);
}
