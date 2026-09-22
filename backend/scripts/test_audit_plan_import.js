const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function testAuditPlanImport() {
  try {
    console.log('1. Logging in as admin...');
    const loginRes = await axios.post('http://127.0.0.1:3001/api/auth/login', {
      username: 'admin',
      password: 'Password@123',
    });
    const token = loginRes.data.access_token || loginRes.data.accessToken || loginRes.data.token;
    console.log('✅ Logged in successfully, token obtained.');

    const filePath = path.resolve(__dirname, '../../docs/THUCTE/UPLOAD/12_Ke_Hoach_Kiem_Toan_Nam_Chi_Tiet_LPBank.xlsx');
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    console.log('2. Uploading file to /api/import/audit-plans...');
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), {
      filename: '12_Ke_Hoach_Kiem_Toan_Nam_Chi_Tiet_LPBank.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const uploadRes = await axios.post('http://127.0.0.1:3001/api/import/audit-plans', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('✅ Import result:', JSON.stringify(uploadRes.data, null, 2));

    console.log('3. Verifying created audit plan in database...');
    const plansRes = await axios.get('http://127.0.0.1:3001/api/audit-plans', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const importedPlan = plansRes.data.find(p => p.year === 2026 && p.name.includes('Kế hoạch Kiểm toán nội bộ năm 2026'));
    if (importedPlan) {
      console.log('✅ Found imported audit plan:');
      console.log(`- Name: ${importedPlan.name}`);
      console.log(`- Year: ${importedPlan.year}`);
      console.log(`- Owner Team: ${importedPlan.ownerTeam}`);
      console.log(`- Status: ${importedPlan.status}`);
      console.log(`- Selected Units Count: ${importedPlan.selectedUnits?.length}`);
      console.log('Sample unit:', importedPlan.selectedUnits?.[0]);
    } else {
      console.log('⚠️ Plan not found in list, total plans:', plansRes.data.length);
    }
  } catch (err) {
    console.error('❌ Error during test:');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    } else {
      console.error(err.message || err);
    }
  }
}

testAuditPlanImport();
