const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '../frontend/src/pages');
const APP_TSX = path.join(__dirname, '../frontend/src/App.tsx');
const MAIN_LAYOUT_TSX = path.join(__dirname, '../frontend/src/layout/MainLayout.tsx');
const METHODOLOGY_TSX = path.join(__dirname, '../frontend/src/pages/MethodologyManagement.tsx');
const SYSTEM_SETTINGS_TSX = path.join(__dirname, '../frontend/src/pages/SystemSettingsHub.tsx');

console.log('=== VERIFYING ROUTES, HUBS, AND SIDEBAR MENU INTEGRATION ===\n');

// 1. Read files
const appContent = fs.readFileSync(APP_TSX, 'utf8');
const layoutContent = fs.readFileSync(MAIN_LAYOUT_TSX, 'utf8');
const methodologyContent = fs.readFileSync(METHODOLOGY_TSX, 'utf8');
const systemSettingsContent = fs.readFileSync(SYSTEM_SETTINGS_TSX, 'utf8');

// 2. Check all pages
const pageFiles = fs.readdirSync(PAGES_DIR)
  .filter(f => f.endsWith('.tsx') && !f.endsWith('.test.tsx') && !f.endsWith('.d.ts'))
  .map(f => f.replace('.tsx', ''));

console.log(`[INFO] Total page component files found: ${pageFiles.length}`);

// Known sub-components that are nested inside main pages (not standalone pages)
const knownSubComponents = [
  'AuditMinutesTab',
  'DetailedSamplingGrid',
  'MasterSamplingTab',
  'SampleTestingDrawer'
];

let orphanCount = 0;
const orphanPages = [];
const verifiedPages = [];

for (const page of pageFiles) {
  if (knownSubComponents.includes(page)) {
    verifiedPages.push({ name: page, type: 'Internal Sub-Component (Tab/Drawer/Grid)' });
    continue;
  }

  const isImportedInApp = appContent.includes(page);
  const isImportedInMethodology = methodologyContent.includes(page);
  const isImportedInSystemSettings = systemSettingsContent.includes(page);

  if (isImportedInApp || isImportedInMethodology || isImportedInSystemSettings) {
    let hubOrRoute = [];
    if (isImportedInApp) hubOrRoute.push('App.tsx');
    if (isImportedInMethodology) hubOrRoute.push('MethodologyManagement');
    if (isImportedInSystemSettings) hubOrRoute.push('SystemSettingsHub');
    
    verifiedPages.push({ name: page, type: `Mapped (${hubOrRoute.join(', ')})` });
  } else {
    orphanCount++;
    orphanPages.push(page);
  }
}

console.log(`\n--- PAGE MAPPING STATUS ---`);
console.log(`Mapped/Embedded: ${verifiedPages.length}`);
console.log(`Orphans: ${orphanCount}`);

if (orphanCount > 0) {
  console.error(`[FAIL] Detected ${orphanCount} orphan pages:`, orphanPages);
  process.exit(1);
} else {
  console.log(`[PASS] 100% of pages are correctly mapped and registered!\n`);
}

// 3. Verify core menus in MainLayout.tsx
const expectedMenuItems = [
  '/',
  '/audit-committee-portal',
  '/regulatory-exams',
  '/auditee-portal',
  '/risk-and-planning',
  '/audit-engagements',
  '/engagement-change-requests',
  '/working-papers',
  '/findings-hub',
  '/continuous-monitoring',
  '/general-tasks',
  '/bsc-kpi',
  '/document-manager',
  '/regulatory-kb',
  '/ai-knowledge',
  '/system-admin',
  '/methodology',
  '/user-guide'
];

console.log('--- VERIFYING SIDEBAR MENU ITEMS IN MAINLAYOUT.TSX ---');
let missingMenuItems = [];
for (const item of expectedMenuItems) {
  if (layoutContent.includes(`'${item}'`) || layoutContent.includes(`"${item}"`)) {
    console.log(`  ✓ Menu item present: ${item}`);
  } else {
    console.error(`  ✗ Missing menu item: ${item}`);
    missingMenuItems.push(item);
  }
}

if (missingMenuItems.length > 0) {
  console.error(`\n[FAIL] Missing ${missingMenuItems.length} menu items in MainLayout.tsx!`);
  process.exit(1);
}

// 4. Verify Methodology Tabs
console.log('\n--- VERIFYING METHODOLOGY MANAGEMENT TABS ---');
const methodologyTabs = ['criteria', 'hsrr', 'templates', 'defect-codes'];
for (const tab of methodologyTabs) {
  if (methodologyContent.includes(`key: '${tab}'`)) {
    console.log(`  ✓ Methodology tab present: ${tab}`);
  } else {
    console.error(`  ✗ Missing methodology tab: ${tab}`);
    process.exit(1);
  }
}

// 5. Verify System Settings Subtabs
console.log('\n--- VERIFYING SYSTEM SETTINGS TABS & SUBTABS ---');
const sysTabs = ['roles', 'personnel', 'audit-trail', 'config'];
for (const tab of sysTabs) {
  if (systemSettingsContent.includes(`key: '${tab}'`)) {
    console.log(`  ✓ System tab present: ${tab}`);
  } else {
    console.error(`  ✗ Missing system tab: ${tab}`);
    process.exit(1);
  }
}

if (systemSettingsContent.includes('IndependenceTracker') && systemSettingsContent.includes('MasterDataGovernancePage')) {
  console.log('  ✓ IndependenceTracker & MasterDataGovernance integrated into SystemSettingsHub');
} else {
  console.error('  ✗ Missing IndependenceTracker or MasterDataGovernance in SystemSettingsHub');
  process.exit(1);
}

console.log('\n======================================================');
console.log('🎉 ALL CHECKS PASSED: ROUTING, HUBS, AND MENUS ARE 100% HEALTHY!');
console.log('======================================================\n');
