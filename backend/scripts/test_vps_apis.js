async function main() {
  const baseUrl = process.argv[2] || 'http://localhost:3000';
  console.log('Testing APIs on:', baseUrl);

  // 1. Login
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Password@123' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.access_token || loginData.accessToken;
  if (!token) {
    console.error('❌ Login failed:', loginData);
    process.exit(1);
  }
  console.log('✅ Admin login SUCCESS! Token received.');

  // 2. Test RCM
  const rcmRes = await fetch(`${baseUrl}/api/risk-control-matrix`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const rcmData = await rcmRes.json();
  console.log(`✅ GET /api/risk-control-matrix: ${Array.isArray(rcmData) ? rcmData.length : 0} records returned.`);
  if (Array.isArray(rcmData) && rcmData.length > 0) {
    console.log('Sample RCM row:', {
      processName: rcmData[0].processName || rcmData[0].legacyProcessName,
      riskName: rcmData[0].riskName,
      controlName: rcmData[0].controlName,
    });
  }

  // 3. Test Audit Engagements
  const engRes = await fetch(`${baseUrl}/api/audit-engagements`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const engData = await engRes.json();
  console.log(`✅ GET /api/audit-engagements: ${Array.isArray(engData) ? engData.length : 0} engagements returned.`);
  if (Array.isArray(engData) && engData.length > 0) {
    console.log('Latest engagement summary:', {
      name: engData[0].name,
      status: engData[0].status,
      isExpectedInfo: engData[0].isExpectedInfo,
      leadAuditor: engData[0].leadAuditor,
      planName: engData[0].planName,
      auditedDepartment: engData[0].auditedDepartment,
    });
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
