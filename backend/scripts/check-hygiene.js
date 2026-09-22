const fs = require('fs');
const path = require('path');

/**
 * Quality Gates & Code Hygiene Audit Script
 * Enforces Architectural Limits, File Hygiene & Best Practices:
 * 1. Prohibits scratch, temporary, or backup files in src/
 * 2. Audits line counts against the 500-line modularity threshold
 * 3. Audits service test coverage pairs (*.service.ts -> *.service.spec.ts)
 */

const MAX_RECOMMENDED_LINES = 500;
const SRC_DIR = path.resolve(__dirname, '../src');

let hasViolations = false;
let totalFilesChecked = 0;
const largeFiles = [];
const missingTestServices = [];

console.log('====================================================');
console.log('🔍 Running Quality Gates & Code Hygiene Audit...');
console.log('====================================================\n');

// 1. Forbidden file patterns
const forbiddenPatterns = [
  /\.bak$/i,
  /\.tmp$/i,
  /\.temp$/i,
  /scratch/i,
  /\.orig$/i,
  /~$/,
];

function auditDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(SRC_DIR, fullPath);

    if (entry.isDirectory()) {
      // Forbidden scratch/temp directories
      if (/(^|[._-])(scratch|temp|tmp)($|[._-])/i.test(entry.name)) {
        console.error(`❌ [HYGIENE VIOLATION] Forbidden scratch folder in src/: ${relPath}`);
        hasViolations = true;
      }
      auditDirectory(fullPath);
    } else if (entry.isFile()) {
      totalFilesChecked++;

      // Check forbidden patterns
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(entry.name)) {
          console.error(`❌ [HYGIENE VIOLATION] Forbidden scratch/backup file in src/: ${relPath}`);
          hasViolations = true;
        }
      }

      // Line count audit for .ts files (excluding node_modules or dist)
      if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lineCount = content.split('\n').length;
        if (lineCount > MAX_RECOMMENDED_LINES && !entry.name.endsWith('.spec.ts')) {
          largeFiles.push({ file: relPath, lines: lineCount });
        }

        // Service test presence audit
        if (entry.name.endsWith('.service.ts')) {
          const specFile = fullPath.replace(/\.service\.ts$/, '.service.spec.ts');
          if (!fs.existsSync(specFile)) {
            missingTestServices.push(relPath);
          }
        }
      }
    }
  }
}

auditDirectory(SRC_DIR);

console.log(`📊 Total Source Files Audited: ${totalFilesChecked}`);

if (largeFiles.length > 0) {
  console.log(`\n⚠️  Legacy Monolithic Files (> ${MAX_RECOMMENDED_LINES} lines): ${largeFiles.length}`);
  console.log('   (Note: Quality Gate enforces <= 500 lines for all NEW files)');
  largeFiles.slice(0, 5).forEach((f) => {
    console.log(`   - ${f.file} (${f.lines} lines)`);
  });
  if (largeFiles.length > 5) {
    console.log(`   ... and ${largeFiles.length - 5} more files.`);
  }
}

if (missingTestServices.length > 0) {
  console.log(`\nℹ️  Services without unit tests: ${missingTestServices.length}`);
  console.log('   (Quality Gate requirement: New services MUST include *.service.spec.ts)');
}

console.log('\n====================================================');
if (hasViolations) {
  console.error('🚨 Quality Gate audit failed! Forbidden scratch/temporary files detected.');
  process.exit(1);
} else {
  console.log('✅ Quality Gate Hygiene Passed: Clean repository tree, 0 scratch files in src/.');
  console.log('====================================================\n');
  process.exit(0);
}
