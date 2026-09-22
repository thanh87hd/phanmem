const axios = require('axios');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'supersecret_lpbank_smart_audit_key_32_characters_long';
const baseURL = 'http://127.0.0.1:3001/api';

async function testFindingCreation() {
  console.log('Testing Concurrent / Atomic Finding Code Generation...');
  const token = jwt.sign(
    { sub: 1, username: 'admin', role: 'admin', nonce: Date.now() },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const authHeader = { Authorization: `Bearer ${token}` };

  try {
    // 1. Create finding 1
    const p1 = axios.post(`${baseURL}/audit-findings`, {
      findingTitle: 'Phát hiện kiểm tra đồng thời A',
      condition: 'Chi tiết thực trạng A',
      criteria: 'Quy định tiêu chuẩn A',
      cause: 'Nguyên nhân A',
      consequence: 'Hậu quả rủi ro A',
      recommendation: 'Kiến nghị xử lý A',
      riskLevel: 'Low',
    }, { headers: authHeader });

    // 2. Create finding 2 concurrently
    const p2 = axios.post(`${baseURL}/audit-findings`, {
      findingTitle: 'Phát hiện kiểm tra đồng thời B',
      condition: 'Chi tiết thực trạng B',
      criteria: 'Quy định tiêu chuẩn B',
      cause: 'Nguyên nhân B',
      consequence: 'Hậu quả rủi ro B',
      recommendation: 'Kiến nghị xử lý B',
      riskLevel: 'Medium',
    }, { headers: authHeader });

    const [r1, r2] = await Promise.all([p1, p2]);
    console.log('Finding 1 created with Code:', r1.data.findingCode, 'ID:', r1.data.id);
    console.log('Finding 2 created with Code:', r2.data.findingCode, 'ID:', r2.data.id);

    if (r1.data.findingCode !== r2.data.findingCode) {
      console.log('✅ PASS: Atomic advisory locks prevented duplicate codes during concurrency!');
    } else {
      console.error('❌ FAIL: Codes were duplicated!');
    }

    // Cleanup test findings
    await axios.delete(`${baseURL}/audit-findings/${r1.data.id}`, { headers: authHeader });
    await axios.delete(`${baseURL}/audit-findings/${r2.data.id}`, { headers: authHeader });
    console.log('Cleaned up test findings.');

  } catch (err) {
    console.error('Error testing finding creation:', err.response?.data || err.message);
  }
}

testFindingCreation();
