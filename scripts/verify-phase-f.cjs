/**
 * Verification Script for Phase F: Evidence Integrity, Storage & Backup Compliance
 * Validates:
 * 1. StorageService supports STORAGE_PATH env var and calculates SHA-256 checksums
 * 2. UnifiedFileAssetAndLink migration defines file_assets with checksum & storageKey
 * 3. Git hygiene & runtime separation: .gitignore ignores uploads/ and backups/
 * 4. ADR-0012 documents data retention policy & external storage architecture
 */

const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('🔍 CHECKING PHASE F: STORAGE & BACKUP COMPLIANCE AUDIT');
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

// 1. Check StorageService supports STORAGE_PATH & calculates checksum
check('StorageService supports STORAGE_PATH and computes SHA-256 checksums', () => {
  const p = path.join(
    rootDir,
    'backend',
    'src',
    'common',
    'storage',
    'storage.service.ts'
  );
  if (!fs.existsSync(p)) return 'Missing storage.service.ts';
  const content = fs.readFileSync(p, 'utf8');
  if (!content.includes('process.env.STORAGE_PATH')) {
    return 'StorageService does not check process.env.STORAGE_PATH';
  }
  if (!content.includes("crypto.createHash('sha256')")) {
    return 'StorageService does not compute sha256 checksum';
  }
  if (!content.includes('calculateChecksum(')) {
    return 'StorageService missing calculateChecksum method';
  }
});

// 2. Check UnifiedFileAssetAndLink migration
check('UnifiedFileAssetAndLink migration exists with checksum & storageKey', () => {
  const p = path.join(
    rootDir,
    'backend',
    'src',
    'database',
    'migrations',
    '1787830800000-CreateUnifiedFileAssetAndLinkTables.ts'
  );
  if (!fs.existsSync(p)) return 'Missing CreateUnifiedFileAssetAndLinkTables migration';
  const content = fs.readFileSync(p, 'utf8');
  if (!content.includes('"storageKey" VARCHAR(500) NOT NULL')) {
    return 'Migration missing storageKey';
  }
  if (!content.includes('"checksum" VARCHAR(64)')) {
    return 'Migration missing checksum';
  }
});

// 3. Check Git hygiene (.gitignore & .gitkeep)
check('Git hygiene: .gitignore ignores uploads/ and backups/', () => {
  const p = path.join(rootDir, '.gitignore');
  if (!fs.existsSync(p)) return 'Missing .gitignore';
  const content = fs.readFileSync(p, 'utf8');
  if (!content.includes('uploads/')) {
    return '.gitignore missing uploads/ ignore rule';
  }
  if (!content.includes('backups/')) {
    return '.gitignore missing backups/ ignore rule';
  }
  const uploadKeep = path.join(rootDir, 'backend', 'uploads', '.gitkeep');
  if (!fs.existsSync(uploadKeep)) {
    return 'backend/uploads/.gitkeep placeholder missing';
  }
});

// 4. Check ADR-0012 documentation
check('ADR-0012 documents retention policy and storage architecture', () => {
  const p = path.join(
    rootDir,
    'docs',
    'adr',
    '0012-retention-policy-and-external-storage.md'
  );
  if (!fs.existsSync(p)) return 'Missing ADR-0012';
  const content = fs.readFileSync(p, 'utf8');
  if (!content.includes('Retention Policy')) {
    return 'ADR-0012 missing Retention Policy section';
  }
  if (!content.includes('SHA-256')) {
    return 'ADR-0012 missing SHA-256 checksum requirement';
  }
});

console.log('\n----------------------------------------------------');
if (failed) {
  console.error('❌ PHASE F VERIFICATION FAILED!');
  process.exit(1);
} else {
  console.log('🎉 ALL PHASE F CHECKS PASSED (4/4)!');
  console.log('====================================================');
}
