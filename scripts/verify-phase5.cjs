/**
 * Phase 5 Verification Script: Git Hygiene & Security Hardening (ADR-0012)
 * Ensures no sensitive runtime data, compiled artifacts, or plaintext secrets
 * are staged in the Git repository.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('🔍 CHECKING PHASE 5: GIT HYGIENE & ADR-0012 COMPLIANCE');
console.log('====================================================\n');

let failed = false;

function check(title, fn) {
  try {
    const result = fn();
    if (result === true || result === undefined) {
      console.log(`✅ [PASS] ${title}`);
    } else {
      console.error(`❌ [FAIL] ${title}: ${result}`);
      failed = true;
    }
  } catch (err) {
    console.error(`❌ [FAIL] ${title}: ${err.message}`);
    failed = true;
  }
}

// 1. Get staged files list
const stagedOutput = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
const stagedFiles = stagedOutput.split(/\r?\n/).map(f => f.trim()).filter(Boolean);

console.log(`📊 Total files currently staged for commit: ${stagedFiles.length}\n`);

// 2. Check no compiled artifacts staged
check('No backend/dist/ files in Git index', () => {
  const distFiles = stagedFiles.filter(f => f.startsWith('backend/dist/'));
  if (distFiles.length > 0) return `Found ${distFiles.length} dist files staged: ${distFiles.slice(0, 3).join(', ')}`;
});

check('No frontend/dist/ files in Git index', () => {
  const distFiles = stagedFiles.filter(f => f.startsWith('frontend/dist/'));
  if (distFiles.length > 0) return `Found ${distFiles.length} dist files staged`;
});

// 3. Check no runtime data / backups staged
check('No backend/backups/ dump files staged (except .gitkeep)', () => {
  const backupFiles = stagedFiles.filter(f => f.startsWith('backend/backups/') && !f.endsWith('.gitkeep'));
  if (backupFiles.length > 0) return `Found backup files staged: ${backupFiles.join(', ')}`;
});

check('No backend/uploads/ files staged (except .gitkeep)', () => {
  const uploadFiles = stagedFiles.filter(f => f.startsWith('backend/uploads/') && !f.endsWith('.gitkeep'));
  if (uploadFiles.length > 0) return `Found ${uploadFiles.length} upload files staged`;
});

// 4. Check no runtime logs staged
check('No application log files staged', () => {
  const logFiles = stagedFiles.filter(f => f.endsWith('.log'));
  if (logFiles.length > 0) return `Found log files staged: ${logFiles.join(', ')}`;
});

// 5. Check no sensitive .env files staged
check('No actual .env secret files staged', () => {
  const envFiles = stagedFiles.filter(f => {
    const base = path.basename(f);
    return base === '.env' || base === '.env.local';
  });
  if (envFiles.length > 0) return `Found active .env files staged: ${envFiles.join(', ')}`;
});

// 6. Check no loose SQL dumps at root
check('No root-level *.sql dump/migration files staged', () => {
  const rootSql = stagedFiles.filter(f => !f.includes('/') && !f.includes('\\') && f.endsWith('.sql'));
  if (rootSql.length > 0) return `Found root SQL files staged: ${rootSql.join(', ')}`;
});

// 7. Check no large dependency graph files staged
check('No codegraph artifact files staged', () => {
  const codegraphFiles = stagedFiles.filter(f => f.toLowerCase().includes('codegraph'));
  if (codegraphFiles.length > 0) return `Found codegraph files staged: ${codegraphFiles.join(', ')}`;
});

// 8. Check runtime placeholder .gitkeep files exist and are staged
const requiredGitkeeps = [
  'backend/uploads/.gitkeep',
  'backend/uploads/backups/.gitkeep',
  'backend/backups/.gitkeep',
  'backend/logs/.gitkeep'
];

requiredGitkeeps.forEach(gitkeep => {
  check(`.gitkeep exists on disk: ${gitkeep}`, () => {
    if (!fs.existsSync(path.resolve(__dirname, '..', gitkeep))) return 'File does not exist on disk';
  });
  check(`.gitkeep is tracked in index: ${gitkeep}`, () => {
    const normalized = gitkeep.replace(/\\/g, '/');
    if (!stagedFiles.includes(normalized)) return 'File is not staged in git index';
  });
});

console.log('\n====================================================');
if (failed) {
  console.error('🚨 AUDIT COMPLIANCE FAILED: Git hygiene rules violated!');
  process.exit(1);
} else {
  console.log('🎉 AUDIT COMPLIANCE PASSED: Clean repository structure!');
  console.log('====================================================');
  process.exit(0);
}
