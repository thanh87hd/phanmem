/**
 * Master Verification Script: All Phases A through F
 */

const { execSync } = require('child_process');
const path = require('path');

const phases = ['a', 'b', 'c', 'd', 'e', 'f'];

console.log('====================================================');
console.log('🚀 EXECUTING MASTER SUITE: PHASES A THROUGH F');
console.log('====================================================\n');

let allPassed = true;

for (const phase of phases) {
  const scriptPath = path.resolve(__dirname, `verify-phase-${phase}.cjs`);
  console.log(`\n▶️ RUNNING PHASE ${phase.toUpperCase()} VERIFICATION...`);
  try {
    execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
  } catch (err) {
    console.error(`❌ Phase ${phase.toUpperCase()} verification failed!`);
    allPassed = false;
    process.exit(1);
  }
}

console.log('\n====================================================');
console.log('🏆 ALL PHASES A THROUGH F PASSED SUCCESSFULLY! 100% GREEN');
console.log('====================================================\n');
