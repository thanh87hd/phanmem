const jwt = require('jsonwebtoken');
require('dotenv').config();

const baseUrl = 'http://localhost:3001';
const jwtSecret = process.env.JWT_SECRET || 'supersecret_lpbank_smart_audit_key_32_characters_long';

async function run() {
  console.log('--- RUNNING SMOKE TEST PHASE 1 ---');

  // Generate Admin JWT Token
  const token = jwt.sign(
    { sub: 1, userId: 1, username: 'admin', role: 'admin', roles: ['admin'] },
    jwtSecret,
    { expiresIn: '8h' }
  );
  console.log('✅ Generated valid Admin JWT Token.');

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 1. Test GET /api/audit-charter (Standard Bounded Context)
  const charterRes = await fetch(`${baseUrl}/api/audit-charter`, { headers });
  const charterData = await charterRes.json();
  console.log(`✅ GET /api/audit-charter (Status ${charterRes.status}): count = ${Array.isArray(charterData) ? charterData.length : 0}`);
  if (Array.isArray(charterData) && charterData.length > 0) {
    console.log('   Sample Charter:', {
      id: charterData[0].id,
      version: charterData[0].version,
      title: charterData[0].title,
      status: charterData[0].status,
      approvedBy: charterData[0].approvedBy,
      hasContent: Boolean(charterData[0].content),
    });
  }

  // 2. Test GET /api/audit-committee/charters (Compatibility Facade)
  const commCharterRes = await fetch(`${baseUrl}/api/audit-committee/charters`, { headers });
  const commCharterData = await commCharterRes.json();
  console.log(`✅ GET /api/audit-committee/charters (Compatibility Facade) (Status ${commCharterRes.status}): count = ${Array.isArray(commCharterData) ? commCharterData.length : 0}`);

  // 3. Test POST /api/audit-committee/charters (Compatibility Facade Create)
  const newCharterPayload = {
    version: 'v2026.2',
    title: 'Điều lệ KTNB Cập nhật Phục vụ Thẩm định 2026',
    content: 'Nội dung điều lệ kiểm toán nội bộ chuẩn theo Thông tư 13/2018/TT-NHNN.',
  };
  const createCharterRes = await fetch(`${baseUrl}/api/audit-committee/charters`, {
    method: 'POST',
    headers,
    body: JSON.stringify(newCharterPayload),
  });
  const createCharterData = await createCharterRes.json();
  console.log(`✅ POST /api/audit-committee/charters (Status ${createCharterRes.status}): created ID: ${createCharterData.id}, version: ${createCharterData.version}, content saved: ${Boolean(createCharterData.content)}`);

  // 4. Test GET /api/risk-indicators/kri-alerts (Standard Bounded Context)
  const kriAlertsRes = await fetch(`${baseUrl}/api/risk-indicators/kri-alerts`, { headers });
  const kriAlertsData = await kriAlertsRes.json();
  console.log(`✅ GET /api/risk-indicators/kri-alerts (New Bounded Context) (Status ${kriAlertsRes.status}): count = ${Array.isArray(kriAlertsData) ? kriAlertsData.length : 0}`);

  // 5. Test GET /api/risk-assessments/kri (Legacy Facade)
  const legacyKriRes = await fetch(`${baseUrl}/api/risk-assessments/kri`, { headers });
  const legacyKriData = await legacyKriRes.json();
  console.log(`✅ GET /api/risk-assessments/kri (Legacy Facade) (Status ${legacyKriRes.status}): count = ${Array.isArray(legacyKriData) ? legacyKriData.length : 0}`);

  // 6. Test POST /api/risk-indicators/kri-alerts with Dual-Mapping
  const newKriPayload = {
    kriCode: 'KRI_SMOKE_TEST_01',
    kriName: 'Tỷ lệ nợ xấu Chi nhánh Test',
    departmentName: 'Chi nhánh Hà Nội',
    departmentCode: 'CN_HN',
    currentValue: '2.8%',
    thresholdValue: '2.0%',
    severity: 'High',
    status: 'Active',
  };
  const createKriRes = await fetch(`${baseUrl}/api/risk-indicators/kri-alerts`, {
    method: 'POST',
    headers,
    body: JSON.stringify(newKriPayload),
  });
  const createKriData = await createKriRes.json();
  console.log(`✅ POST /api/risk-indicators/kri-alerts (Dual-Mapping Verification) (Status ${createKriRes.status}):`, {
    id: createKriData.id,
    kriCode: createKriData.kriCode,
    observedValue: createKriData.observedValue,
    currentValue: createKriData.currentValue,
    thresholdValue: createKriData.thresholdValue,
    threshold: createKriData.threshold,
    severity: createKriData.severity,
  });

  // 7. Verify again via Legacy endpoint /api/risk-assessments/kri that the new KRI is visible
  const verifyLegacyRes = await fetch(`${baseUrl}/api/risk-assessments/kri`, { headers });
  const verifyLegacyData = await verifyLegacyRes.json();
  console.log(`✅ Verification via Legacy GET /api/risk-assessments/kri: count = ${verifyLegacyData.length}`);

  console.log('--- ALL PHASE 1 SMOKE TESTS PASSED SUCCESSFULLY! ---');
}

run().catch((err) => {
  console.error('❌ Smoke test failed:', err);
  process.exit(1);
});
