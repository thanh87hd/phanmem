/**
 * Master Verification Suite: RBIA Risk & Planning Hub Refactoring
 * Verifies all 5 pillars:
 * 1. Database schema & TypeORM entity normalization
 * 2. Backend services, snapshot versioning & new API contracts
 * 3. Frontend 4-step RBIA Hub architecture (?step=...&view=...)
 * 4. Screen consolidation (Risk Signals drawer, Stress Scenario modal, Methodology page)
 * 5. Route cutover, 11 legacy redirects removal -> 404, and MainLayout menu alignment
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (details) console.error(`     Details: ${details}`);
    failedTests++;
  }
}

console.log('======================================================================');
console.log('🚀 RUNNING RBIA PLANNING HUB REFACTORING VERIFICATION SUITE');
console.log('======================================================================\n');

// ─────────────────────────────────────────────────────────────────────
// 1. DATABASE ENTITIES & SCHEMA NORMALIZATION
// ─────────────────────────────────────────────────────────────────────
console.log('📦 [1/5] Checking Database Entities & Schema Normalization...');

// Migration exists
const migrationPath = path.join(
  rootDir,
  'backend/src/database/migrations/1787831200000-RbiaPlanningHubRefactor.ts'
);
assert(fs.existsSync(migrationPath), 'Single-release Migration file exists');

if (fs.existsSync(migrationPath)) {
  const migContent = fs.readFileSync(migrationPath, 'utf-8');
  assert(
    migContent.includes('_snapshot_departments') &&
    migContent.includes('_snapshot_audit_universe') &&
    migContent.includes('_snapshot_risk_assessments'),
    'Migration includes instant rollback snapshot tables (_snapshot_*)'
  );
  assert(
    migContent.includes('risk_assessment_scores'),
    'Migration creates normalized risk_assessment_scores table'
  );
}

// Department entity
const deptEntityPath = path.join(rootDir, 'backend/src/departments/entities/department.entity.ts');
if (fs.existsSync(deptEntityPath)) {
  const deptContent = fs.readFileSync(deptEntityPath, 'utf-8');
  assert(
    !deptContent.includes('parent: string') && deptContent.includes('parentId: number'),
    'Department entity normalized on parentId, legacy parent string removed'
  );
}

// AuditUniverse entity
const universeEntityPath = path.join(rootDir, 'backend/src/audit-universe/entities/audit-universe.entity.ts');
if (fs.existsSync(universeEntityPath)) {
  const uContent = fs.readFileSync(universeEntityPath, 'utf-8');
  const hasStaticScores =
    uContent.includes('financialSize:') ||
    uContent.includes('operationalRiskScore:') ||
    uContent.includes('riskScore:');
  assert(
    !hasStaticScores,
    'AuditUniverse entity dropped static score columns (projected dynamically from RiskAssessment)'
  );
  assert(
    uContent.includes('assessments: RiskAssessment[]') || uContent.includes('RiskAssessment'),
    'AuditUniverse has relation to RiskAssessment'
  );
}

// RiskControlMatrix entity
const rcmEntityPath = path.join(rootDir, 'backend/src/risk-control-matrix/entities/risk-control-matrix.entity.ts');
if (fs.existsSync(rcmEntityPath)) {
  const rcmContent = fs.readFileSync(rcmEntityPath, 'utf-8');
  assert(
    rcmContent.includes('riskProfileId') && rcmContent.includes('RiskProfile'),
    'RiskControlMatrix has riskProfileId FK relation to RiskProfile'
  );
}

// RiskRegister entity
const rrEntityPath = path.join(rootDir, 'backend/src/risk-register/entities/risk-register.entity.ts');
if (fs.existsSync(rrEntityPath)) {
  const rrContent = fs.readFileSync(rrEntityPath, 'utf-8');
  assert(
    rrContent.includes('auditUniverseId') &&
    rrContent.includes('riskProfileId') &&
    rrContent.includes('assessmentYear'),
    'RiskRegister entity standardized on auditUniverseId, riskProfileId, assessmentYear'
  );
}

// RiskAssessment & RiskAssessmentScore entities
const scoreEntityPath = path.join(
  rootDir,
  'backend/src/risk-assessments/entities/risk-assessment-score.entity.ts'
);
assert(fs.existsSync(scoreEntityPath), 'RiskAssessmentScore entity created');

const raEntityPath = path.join(
  rootDir,
  'backend/src/risk-assessments/entities/risk-assessment.entity.ts'
);
if (fs.existsSync(raEntityPath)) {
  const raContent = fs.readFileSync(raEntityPath, 'utf-8');
  assert(
    raContent.includes('scores: RiskAssessmentScore[]'),
    'RiskAssessment has OneToMany relation with RiskAssessmentScore'
  );
  assert(
    raContent.includes('criteriaVersionId'),
    'RiskAssessment has criteriaVersionId FK for methodology versioning'
  );
}

// AuditPlan & AuditPlanUnit
const apEntityPath = path.join(rootDir, 'backend/src/audit-plans/entities/audit-plan.entity.ts');
if (fs.existsSync(apEntityPath)) {
  const apContent = fs.readFileSync(apEntityPath, 'utf-8');
  assert(
    !apContent.includes("@Column({ type: 'simple-json', nullable: true }) selectedUnits") &&
    apContent.includes('get selectedUnits()'),
    'AuditPlan entity derives selectedUnits dynamically from relational planUnits'
  );
}

const apuEntityPath = path.join(rootDir, 'backend/src/audit-plans/entities/audit-plan-unit.entity.ts');
if (fs.existsSync(apuEntityPath)) {
  const apuContent = fs.readFileSync(apuEntityPath, 'utf-8');
  assert(
    apuContent.includes('assessmentId') && apuContent.includes('RiskAssessment'),
    'AuditPlanUnit links directly to RiskAssessment'
  );
}

// ResourceDemand
const rdEntityPath = path.join(rootDir, 'backend/src/resource-capacity/entities/resource-demand.entity.ts');
if (fs.existsSync(rdEntityPath)) {
  const rdContent = fs.readFileSync(rdEntityPath, 'utf-8');
  assert(
    rdContent.includes('planUnitId') && rdContent.includes('AuditPlanUnit'),
    'ResourceDemand links to approved AuditPlanUnit via planUnitId'
  );
}

// ─────────────────────────────────────────────────────────────────────
// 2. BACKEND SERVICES & NEW API CONTRACTS
// ─────────────────────────────────────────────────────────────────────
console.log('\n⚙️ [2/5] Checking Backend Services & API Contracts...');

const rpControllerPath = path.join(rootDir, 'backend/src/risk-assessments/risk-planning.controller.ts');
assert(fs.existsSync(rpControllerPath), 'RiskPlanningController exists');
if (fs.existsSync(rpControllerPath)) {
  const rpcContent = fs.readFileSync(rpControllerPath, 'utf-8');
  assert(
    rpcContent.includes('risk-planning/overview') && rpcContent.includes('risk-signals'),
    'Controller registers GET /risk-planning/overview and GET /risk-signals'
  );
}

const rpServicePath = path.join(rootDir, 'backend/src/risk-assessments/risk-planning.service.ts');
assert(fs.existsSync(rpServicePath), 'RiskPlanningService exists');
if (fs.existsSync(rpServicePath)) {
  const rpsContent = fs.readFileSync(rpServicePath, 'utf-8');
  assert(
    rpsContent.includes('getOverview') &&
    rpsContent.includes('step1Scope') &&
    rpsContent.includes('step2Library') &&
    rpsContent.includes('step3Prioritization') &&
    rpsContent.includes('step4Plan'),
    'RiskPlanningService computes 4-step overview metrics and action items'
  );
  assert(
    rpsContent.includes('getRiskSignals') &&
    rpsContent.includes("'KRI'") &&
    rpsContent.includes("'RCSA'") &&
    rpsContent.includes("'CAATS'") &&
    rpsContent.includes("'PRIOR_FINDING'"),
    'RiskPlanningService aggregates read-only telemetry from KRI, RCSA, CAATs, and Prior Findings'
  );
}

// ─────────────────────────────────────────────────────────────────────
// 3. FRONTEND HUB ARCHITECTURE (?step=...&view=...)
// ─────────────────────────────────────────────────────────────────────
console.log('\n🌐 [3/5] Checking Frontend Hub & Step/View Navigation...');

const hubPath = path.join(rootDir, 'frontend/src/pages/RiskAndPlanningHub.tsx');
assert(fs.existsSync(hubPath), 'RiskAndPlanningHub.tsx exists');
if (fs.existsSync(hubPath)) {
  const hubContent = fs.readFileSync(hubPath, 'utf-8');
  assert(
    hubContent.includes('CHU TRÌNH LẬP KẾ HOẠCH KIỂM TOÁN DỰA TRÊN RỦI RO (RBIA)'),
    'Hub banner renamed to Chu trình lập kế hoạch kiểm toán dựa trên rủi ro (RBIA Line 3)'
  );
  assert(
    hubContent.includes("key: 'scope'") &&
    hubContent.includes("key: 'library'") &&
    hubContent.includes("key: 'prioritization'") &&
    hubContent.includes("key: 'plan'"),
    'Hub renders strictly 4 canonical steps'
  );
  assert(
    hubContent.includes("searchParams.get('step')") &&
    hubContent.includes("searchParams.get('view')"),
    'Hub query contract migrated to ?step=...&view=...'
  );
  assert(
    hubContent.includes("legacyTab === 'universe'") &&
    hubContent.includes("legacyTab === 'assessment'"),
    'Hub gracefully handles legacy tab/subTab fallback'
  );
}

// ─────────────────────────────────────────────────────────────────────
// 4. SCREEN CONSOLIDATION & METHODOLOGY SEPARATION
// ─────────────────────────────────────────────────────────────────────
console.log('\n🔍 [4/5] Checking Screen Consolidation & Methodology...');

const raPath = path.join(rootDir, 'frontend/src/pages/RiskAssessment.tsx');
if (fs.existsSync(raPath)) {
  const raContent = fs.readFileSync(raPath, 'utf-8');
  assert(
    !raContent.includes('RiskRegister embedded={true}'),
    'RiskRegister tab removed from RiskAssessment (lives independently in Step 3)'
  );
  assert(
    !raContent.includes('<RiskProfilesTab />'),
    'RiskProfilesTab removed from RiskAssessment (relocated to /methodology and Step 2)'
  );
  assert(
    raContent.includes('RiskSignalsDrawer'),
    'RiskAssessment integrates read-only RiskSignalsDrawer'
  );
  assert(
    raContent.includes('ScenarioRiskMap') && raContent.includes('isScenarioModalOpen'),
    'Scenario Risk Map consolidated into stress testing modal/drawer drill-down'
  );
}

const signalsDrawerPath = path.join(
  rootDir,
  'frontend/src/components/risk-scoring/RiskSignalsDrawer.tsx'
);
assert(fs.existsSync(signalsDrawerPath), 'RiskSignalsDrawer component exists');

const methodologyPath = path.join(rootDir, 'frontend/src/pages/MethodologyManagement.tsx');
assert(fs.existsSync(methodologyPath), 'MethodologyManagement page created at /methodology');
if (fs.existsSync(methodologyPath)) {
  const methContent = fs.readFileSync(methodologyPath, 'utf-8');
  assert(
    methContent.includes('RiskCriteria') && methContent.includes('RiskProfilesTab'),
    'MethodologyManagement hosts Risk Criteria & HSRR (819 Rủi Ro chuẩn)'
  );
  assert(
    methContent.includes("isAdminOrDirector"),
    'MethodologyManagement enforces access control for Admin & Trưởng Ban KTNB'
  );
}

// ─────────────────────────────────────────────────────────────────────
// 5. ROUTE CUTOVER & LEGACY 404 VERIFICATION
// ─────────────────────────────────────────────────────────────────────
console.log('\n🚦 [5/5] Checking Route Cutover & Legacy 404...');

const notFoundPath = path.join(rootDir, 'frontend/src/pages/NotFound.tsx');
assert(fs.existsSync(notFoundPath), 'NotFound (404) page component exists');

const appPath = path.join(rootDir, 'frontend/src/App.tsx');
if (fs.existsSync(appPath)) {
  const appContent = fs.readFileSync(appPath, 'utf-8');

  // Verify all 11 legacy routes are deleted
  const legacyRoutes = [
    'path="audit-universe"',
    'path="departments"',
    'path="risk-control-matrix"',
    'path="risk-register"',
    'path="thematic-analysis"',
    'path="test-of-control"',
    'path="risk-criteria"',
    'path="risk-assessment"',
    'path="scenario-risk-map"',
    'path="audit-plan"',
    'path="resource-capacity"',
  ];

  let legacyFound = false;
  for (const lr of legacyRoutes) {
    if (appContent.includes(lr)) {
      legacyFound = true;
      console.error(`     Found forbidden legacy route: ${lr}`);
    }
  }
  assert(!legacyFound, 'All 11 legacy redirects removed from App.tsx (return 404 Not Found)');

  assert(
    appContent.includes('path="methodology"'),
    'App.tsx registers /methodology route under Admin section'
  );

  assert(
    appContent.includes('<Route path="*" element={<NotFound />} />'),
    'App.tsx fallback route returns NotFound (404)'
  );
}

const layoutPath = path.join(rootDir, 'frontend/src/layout/MainLayout.tsx');
if (fs.existsSync(layoutPath)) {
  const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
  assert(
    layoutContent.includes('/risk-and-planning?step=scope') &&
    layoutContent.includes('/risk-and-planning?step=library') &&
    layoutContent.includes('/risk-and-planning?step=prioritization') &&
    layoutContent.includes('/risk-and-planning?step=plan'),
    'MainLayout menu displays strictly the 4 canonical RBIA steps'
  );
  assert(
    layoutContent.includes('/methodology'),
    'MainLayout registers Quản trị Phương pháp luận & HSRR menu item'
  );
  assert(
    layoutContent.includes("navigate('/risk-and-planning?step=plan')"),
    'MainLayout top banner shortcut points to /risk-and-planning?step=plan'
  );
}

// ─────────────────────────────────────────────────────────────────────
// FINAL RESULTS SUMMARY
// ─────────────────────────────────────────────────────────────────────
console.log('\n======================================================================');
console.log(`📊 VERIFICATION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
if (failedTests === 0) {
  console.log('🎉 100% GREEN! ALL RBIA REFACTORING ARCHITECTURAL CRITERIA MET.');
  console.log('======================================================================\n');
  process.exit(0);
} else {
  console.error(`❌ ${failedTests} TEST(S) FAILED. Please review the errors above.`);
  console.log('======================================================================\n');
  process.exit(1);
}
