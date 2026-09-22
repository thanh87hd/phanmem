/**
 * Verification Script for Phase C: 1:N Finding-Recommendation Relation & Legacy Column Normalization
 * Validates:
 * 1. AuditFinding entity has 1:N recommendations relation
 * 2. Recommendation entity has N:1 auditFinding relation
 * 3. AuditFindingsService findOne includes recommendations in relations array
 * 4. Dual-read and sync mechanisms exist for legacy fields (ADR-0010)
 * 5. BackfillFindingsRecommendationsRelation migration exists
 */

const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('🔍 CHECKING PHASE C: 1:N FINDING-RECOMMENDATION RELATION');
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

// 1. Check AuditFinding has OneToMany recommendations
check('AuditFinding entity defines OneToMany recommendations relation', () => {
  const entityPath = path.join(
    rootDir,
    'backend',
    'src',
    'audit-findings',
    'entities',
    'audit-finding.entity.ts'
  );
  const content = fs.readFileSync(entityPath, 'utf8');
  if (!content.includes('recommendations?: Recommendation[];') && !content.includes('recommendations: Recommendation[];')) {
    return 'Missing recommendations relation property in AuditFinding';
  }
  if (!content.includes('@OneToMany(() => Recommendation')) {
    return 'Missing @OneToMany(() => Recommendation) decorator';
  }
});

// 2. Check Recommendation has ManyToOne auditFinding
check('Recommendation entity links to finding.recommendations in ManyToOne', () => {
  const entityPath = path.join(
    rootDir,
    'backend',
    'src',
    'recommendations',
    'entities',
    'recommendation.entity.ts'
  );
  const content = fs.readFileSync(entityPath, 'utf8');
  if (!content.includes('finding.recommendations')) {
    return 'Recommendation entity missing reverse relation to finding.recommendations';
  }
});

// 3. Check AuditFindingsService.findOne loads recommendations
check('AuditFindingsService.findOne includes recommendations relation', () => {
  const servicePath = path.join(
    rootDir,
    'backend',
    'src',
    'audit-findings',
    'audit-findings.service.ts'
  );
  const content = fs.readFileSync(servicePath, 'utf8');
  if (!content.includes("'recommendations'")) {
    return 'AuditFindingsService.findOne missing recommendations in relations array';
  }
});

// 4. Check Dual-read & legacy synchronization (ADR-0010)
check('AuditFinding entity implements dual-read / syncLegacyFields for legacy fields', () => {
  const entityPath = path.join(
    rootDir,
    'backend',
    'src',
    'audit-findings',
    'entities',
    'audit-finding.entity.ts'
  );
  const content = fs.readFileSync(entityPath, 'utf8');
  if (!content.includes('syncLegacyFields()')) {
    return 'Missing syncLegacyFields() hook in AuditFinding';
  }
  if (!content.includes('populateLegacyFields()')) {
    return 'Missing populateLegacyFields() hook in AuditFinding';
  }
});

// 5. Check migration exists
check('BackfillFindingsRecommendationsRelation migration exists', () => {
  const migrationPath = path.join(
    rootDir,
    'backend',
    'src',
    'database',
    'migrations',
    '1787830900000-BackfillFindingsRecommendationsRelation.ts'
  );
  if (!fs.existsSync(migrationPath)) {
    return 'Migration file 1787830900000-BackfillFindingsRecommendationsRelation.ts not found';
  }
});

console.log('\n----------------------------------------------------');
if (failed) {
  console.error('❌ PHASE C VERIFICATION FAILED!');
  process.exit(1);
} else {
  console.log('🎉 ALL PHASE C CHECKS PASSED (5/5)!');
  console.log('====================================================');
}
