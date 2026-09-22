/**
 * Verification Script for Phase E: De-monolithize Large Services
 * Validates:
 * 1. AuditFindingsStatisticsService exists as a dedicated service
 * 2. AuditFindingsModule provides and exports AuditFindingsStatisticsService
 * 3. AuditFindingsService injects and delegates getMultiDimensionalStats to AuditFindingsStatisticsService
 * 4. AuditFindingsService line count reduced below 750 lines
 */

const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('🔍 CHECKING PHASE E: DE-MONOLITHIZE LARGE SERVICES');
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

// 1. Check AuditFindingsStatisticsService exists
check('AuditFindingsStatisticsService exists with getMultiDimensionalStats', () => {
  const p = path.join(
    rootDir,
    'backend',
    'src',
    'audit-findings',
    'audit-findings-statistics.service.ts'
  );
  if (!fs.existsSync(p)) return 'Missing audit-findings-statistics.service.ts';
  const content = fs.readFileSync(p, 'utf8');
  if (!content.includes('class AuditFindingsStatisticsService')) {
    return 'Missing class AuditFindingsStatisticsService';
  }
  if (!content.includes('getMultiDimensionalStats(')) {
    return 'Missing getMultiDimensionalStats in statistics service';
  }
});

// 2. Check AuditFindingsModule provides and exports AuditFindingsStatisticsService
check('AuditFindingsModule registers and exports AuditFindingsStatisticsService', () => {
  const p = path.join(
    rootDir,
    'backend',
    'src',
    'audit-findings',
    'audit-findings.module.ts'
  );
  const content = fs.readFileSync(p, 'utf8');
  if (!content.includes('AuditFindingsStatisticsService')) {
    return 'AuditFindingsModule missing AuditFindingsStatisticsService';
  }
});

// 3. Check AuditFindingsService delegation
check('AuditFindingsService injects and delegates to AuditFindingsStatisticsService', () => {
  const p = path.join(
    rootDir,
    'backend',
    'src',
    'audit-findings',
    'audit-findings.service.ts'
  );
  const content = fs.readFileSync(p, 'utf8');
  if (!content.includes('private readonly statsService: AuditFindingsStatisticsService')) {
    return 'AuditFindingsService does not inject statsService';
  }
  if (!content.includes('this.statsService.getMultiDimensionalStats(')) {
    return 'AuditFindingsService does not delegate getMultiDimensionalStats to statsService';
  }
});

// 4. Check AuditFindingsService size reduction
check('AuditFindingsService line count reduced below 750 lines', () => {
  const p = path.join(
    rootDir,
    'backend',
    'src',
    'audit-findings',
    'audit-findings.service.ts'
  );
  const content = fs.readFileSync(p, 'utf8');
  const lineCount = content.split('\n').length;
  console.log(`   ℹ️ Current AuditFindingsService line count: ${lineCount} (was 1,112 lines)`);
  if (lineCount > 750) {
    return `AuditFindingsService is still too large: ${lineCount} lines`;
  }
});

console.log('\n----------------------------------------------------');
if (failed) {
  console.error('❌ PHASE E VERIFICATION FAILED!');
  process.exit(1);
} else {
  console.log('🎉 ALL PHASE E CHECKS PASSED (4/4)!');
  console.log('====================================================');
}
