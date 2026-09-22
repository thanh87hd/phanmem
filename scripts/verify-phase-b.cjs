/**
 * Verification Script for Phase B: State Machine & Quality Review Hardening
 * Validates:
 * 1. AuditFinding entity lifecycle audit columns
 * 2. AuditFindingsService state machine validations (withdrawalReason, returnReason, deletion protection)
 * 3. QualityReviewsService 3-tier sequential review gating (Self -> Supervisor -> Independent)
 * 4. WorkingPapersService completion gate, locked protection, and deletion protection
 * 5. RecommendationsService closure validation and deletion protection
 * 6. Migration file for finding lifecycle audit columns
 */

const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('🔍 CHECKING PHASE B: STATE MACHINE & QUALITY REVIEW HARDENING');
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

// 1. Check AuditFinding entity lifecycle columns
check('AuditFinding entity has lifecycle audit columns', () => {
  const entityPath = path.join(
    rootDir,
    'backend',
    'src',
    'audit-findings',
    'entities',
    'audit-finding.entity.ts'
  );
  const content = fs.readFileSync(entityPath, 'utf8');
  const requiredFields = [
    'withdrawalReason',
    'withdrawnById',
    'withdrawnAt',
    'returnReason',
    'returnedById',
    'returnedAt',
    'confirmedById',
    'confirmedAt',
  ];
  for (const field of requiredFields) {
    if (!content.includes(field)) {
      return `AuditFinding entity missing field: ${field}`;
    }
  }
});

// 2. Check AuditFindingsService state machine & delete guard
check('AuditFindingsService enforces withdrawal reason and backward return reason', () => {
  const servicePath = path.join(
    rootDir,
    'backend',
    'src',
    'audit-findings',
    'audit-findings.service.ts'
  );
  const content = fs.readFileSync(servicePath, 'utf8');
  if (!content.includes("newStatus === 'Withdrawn'")) {
    return 'Missing Withdrawn status handling';
  }
  if (!content.includes('withdrawalReason')) {
    return 'Missing withdrawalReason check';
  }
  if (!content.includes('returnReason')) {
    return 'Missing returnReason check';
  }
});

check('AuditFindingsService prevents deleting findings not in Draft/Open status', () => {
  const servicePath = path.join(
    rootDir,
    'backend',
    'src',
    'audit-findings',
    'audit-findings.service.ts'
  );
  const content = fs.readFileSync(servicePath, 'utf8');
  if (!content.includes("finding.status !== 'Draft' && finding.status !== 'Open'")) {
    return 'AuditFindingsService missing delete status guard';
  }
});

// 3. Check QualityReviewsService sequential review gating
check('QualityReviewsService enforces sequential review gating (Self -> Supervisor -> Independent)', () => {
  const servicePath = path.join(
    rootDir,
    'backend',
    'src',
    'quality-reviews',
    'quality-reviews.service.ts'
  );
  const content = fs.readFileSync(servicePath, 'utf8');
  if (!content.includes("qr.selfReviewStatus !== 'Completed'")) {
    return 'QualityReviewsService missing self review completion check';
  }
  if (!content.includes("qr.supervisorReviewStatus !== 'Approved'")) {
    return 'QualityReviewsService missing supervisor approval check before independent review';
  }
});

// 4. Check WorkingPapersService protection
check('WorkingPapersService blocks edits on Locked WP and blocks deletion on Submitted/Approved/Locked WP', () => {
  const servicePath = path.join(
    rootDir,
    'backend',
    'src',
    'working-papers',
    'working-papers.service.ts'
  );
  const content = fs.readFileSync(servicePath, 'utf8');
  if (!content.includes("currentWp.status === 'Locked'")) {
    return 'WorkingPapersService missing Locked WP update block';
  }
  if (!content.includes("wp.status === 'Submitted' ||") || !content.includes("wp.status === 'Locked'")) {
    return 'WorkingPapersService missing deletion guard on Submitted/Approved/Locked WP';
  }
});

// 5. Check RecommendationsService protection
check('RecommendationsService blocks direct Closed status on update and prevents deleting Closed/Verified recommendations', () => {
  const servicePath = path.join(
    rootDir,
    'backend',
    'src',
    'recommendations',
    'recommendations.service.ts'
  );
  const content = fs.readFileSync(servicePath, 'utf8');
  if (!content.includes("closureStatus === 'Closed'") || !content.includes('Không thể đóng kiến nghị trực tiếp')) {
    return 'RecommendationsService missing direct closure block';
  }
  if (!content.includes("rec.status === 'Verified' || rec.closureStatus === 'Closed'")) {
    return 'RecommendationsService missing Verified/Closed delete block';
  }
});

// 6. Check migration exists
check('AddFindingLifecycleAuditColumns migration exists', () => {
  const migrationPath = path.join(
    rootDir,
    'backend',
    'src',
    'database',
    'migrations',
    '1787831100000-AddFindingLifecycleAuditColumns.ts'
  );
  if (!fs.existsSync(migrationPath)) {
    return 'Migration file 1787831100000-AddFindingLifecycleAuditColumns.ts not found';
  }
});

console.log('\n----------------------------------------------------');
if (failed) {
  console.error('❌ PHASE B VERIFICATION FAILED!');
  process.exit(1);
} else {
  console.log('🎉 ALL PHASE B CHECKS PASSED (6/6)!');
  console.log('====================================================');
}
