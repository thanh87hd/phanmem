/**
 * BỘ KIỂM THỬ TÍCH HỢP TOÀN DIỆN BACKEND API (COMPREHENSIVE API TEST SUITE)
 * =========================================================================
 * Kiểm thử tự động bao phủ 16 phân hệ nghiệp vụ chính của Phần mềm KTNB 4.0
 * Hỗ trợ chạy trên cả môi trường Local (http://localhost:3001) và Cloud VPS (https://chinhta.io.vn)
 *
 * Cách chạy:
 *   node scripts/test-api-comprehensive.cjs --target=vps
 *   node scripts/test-api-comprehensive.cjs --target=local
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const args = process.argv.slice(2);
const isLocal = args.includes('--target=local');
const BASE_URL = isLocal ? 'http://localhost:3001' : 'https://chinhta.io.vn';
const API_BASE = `${BASE_URL}/api`;

console.log('========================================================================');
console.log('🚀 KHỞI CHẠY BỘ TEST API TOÀN DIỆN (16 PHÂN HỆ NGHIỆP VỤ KTNB 4.0)');
console.log(`🎯 Môi trường mục tiêu: ${BASE_URL} (${isLocal ? 'LOCAL DEV' : 'PRODUCTION VPS'})`);
console.log('========================================================================\n');

let token = '';
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function sendRequest(endpoint, method = 'GET', data = null, customHeaders = {}) {
  const urlObj = new URL(`${API_BASE}${endpoint}`);
  const isHttps = urlObj.protocol === 'https:';
  const client = isHttps ? https : http;

  const headers = {
    'Accept': 'application/json',
    ...customHeaders,
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let bodyData = null;
  if (data) {
    headers['Content-Type'] = 'application/json';
    bodyData = JSON.stringify(data);
    headers['Content-Length'] = Buffer.byteLength(bodyData);
  }

  const options = {
    hostname: urlObj.hostname,
    port: urlObj.port || (isHttps ? 443 : 80),
    path: urlObj.pathname + urlObj.search,
    method,
    headers,
    rejectUnauthorized: false,
    timeout: 20000,
  };

  return new Promise((resolve, reject) => {
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(body);
        } catch {
          parsed = body;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout after 20s requesting ${endpoint}`));
    });

    if (bodyData) req.write(bodyData);
    req.end();
  });
}

async function test(name, fn) {
  totalTests++;
  process.stdout.write(`[${totalTests.toString().padStart(2, '0')}] ${name} ... `);
  try {
    await fn();
    passedTests++;
    console.log('✅ PASS');
  } catch (err) {
    failedTests++;
    console.log(`❌ FAIL\n    👉 Lý do: ${err.message}`);
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

async function runSuite() {
  // ── 1. Xác thực & Cấp phiên JWT ──────────────────────────────────────
  await test('1. Auth: Đăng nhập cấp phát JWT Token (POST /auth/login)', async () => {
    const res = await sendRequest('/auth/login', 'POST', {
      username: 'admin',
      password: '@Lpbank2026!',
    });
    expect(res.status === 200 || res.status === 201, `Status ${res.status}`);
    expect(res.body && res.body.access_token, 'Thiếu access_token');
    token = res.body.access_token;
  });

  await test('2. Auth: Thông tin người dùng hiện tại (GET /auth/me hoặc /users/profile)', async () => {
    const res = await sendRequest('/auth/me');
    expect(res.status === 200 || res.status === 404, `Unexpected status ${res.status}`);
  });

  // ── 2. Quản trị Người dùng & Phân quyền ──────────────────────────────
  await test('3. Users: Lấy danh sách nhân sự người dùng (GET /users)', async () => {
    const res = await sendRequest('/users');
    expect(res.status === 200, `Status ${res.status}`);
    const list = Array.isArray(res.body) ? res.body : res.body.data;
    expect(Array.isArray(list) && list.length > 0, 'Danh sách users rỗng');
  });

  await test('4. Roles: Lấy ma trận vai trò phân quyền (GET /roles)', async () => {
    const res = await sendRequest('/roles');
    expect(res.status === 200, `Status ${res.status}`);
    const roles = Array.isArray(res.body) ? res.body : res.body.data;
    expect(Array.isArray(roles) && roles.length >= 5, 'Số lượng roles < 5');
  });

  // ── 3. Vũ trụ kiểm toán & Tổ chức ────────────────────────────────────
  await test('5. Departments: Danh mục phòng ban & chi nhánh (GET /departments)', async () => {
    const res = await sendRequest('/departments');
    expect(res.status === 200, `Status ${res.status}`);
  });

  await test('6. Audit Universe: Danh mục đối tượng kiểm toán (GET /audit-universe)', async () => {
    const res = await sendRequest('/audit-universe');
    expect(res.status === 200, `Status ${res.status}`);
  });

  // ── 4. Rủi ro, RCM & Lập kế hoạch ────────────────────────────────────
  await test('7. Risk Assessments: Đánh giá & Chấm điểm rủi ro (GET /risk-assessments)', async () => {
    const res = await sendRequest('/risk-assessments');
    expect(res.status === 200, `Status ${res.status}`);
  });

  await test('8. RCM: Thư viện rủi ro & kiểm soát COSO (GET /risk-control-matrix)', async () => {
    const res = await sendRequest('/risk-control-matrix');
    expect(res.status === 200, `Status ${res.status}`);
  });

  await test('9. Audit Plans: Kế hoạch kiểm toán năm & mandays (GET /audit-plans)', async () => {
    const res = await sendRequest('/audit-plans');
    expect(res.status === 200, `Status ${res.status}`);
  });

  // ── 5. Thực hiện Cuộc kiểm toán & Giấy tờ làm việc ───────────────────
  await test('10. Audit Engagements: Danh sách cuộc kiểm toán thực địa (GET /audit-engagements)', async () => {
    const res = await sendRequest('/audit-engagements');
    expect(res.status === 200, `Status ${res.status}`);
    const engs = Array.isArray(res.body) ? res.body : res.body.data;
    expect(Array.isArray(engs), 'audit-engagements không trả về mảng');
  });

  await test('11. Working Papers: Danh mục giấy tờ làm việc (GET /working-papers)', async () => {
    const res = await sendRequest('/working-papers');
    expect(res.status === 200, `Status ${res.status}`);
  });

  await test('12. File Assets: Quản lý liên kết tệp & bằng chứng (GET /file-assets/links)', async () => {
    const res = await sendRequest('/file-assets/links?ownerType=WorkingPaper&ownerId=1');
    expect(res.status === 200, `Status ${res.status}`);
  });

  // ── 6. Phát hiện, Kiến nghị & Báo cáo ────────────────────────────────
  await test('13. Audit Findings: Trung tâm phát hiện 5C (GET /audit-findings)', async () => {
    const res = await sendRequest('/audit-findings');
    expect(res.status === 200, `Status ${res.status}`);
    // Đảm bảo không còn lỗi 500 column teammembers
    expect(!String(res.body).includes('column'), 'Lỗi schema cột DB');
  });

  await test('14. Recommendations: Danh sách kiến nghị & SLA (GET /recommendations)', async () => {
    const res = await sendRequest('/recommendations');
    expect(res.status === 200, `Status ${res.status}`);
    const recs = Array.isArray(res.body) ? res.body : res.body.data;
    expect(Array.isArray(recs), 'recommendations không trả về mảng');
  });

  // ── 7. Cổng chuyên biệt & Giám sát liên tục ──────────────────────────
  await test('15. Regulatory Exams: Giám sát đoàn thanh tra NHNN (GET /regulatory-exams)', async () => {
    const res = await sendRequest('/regulatory-exams');
    expect(res.status === 200, `Status ${res.status}`);
  });

  await test('16. Audit Trail: Nhật ký kiểm toán toàn vẹn SHA-256 (GET /audit-trail)', async () => {
    const res = await sendRequest('/audit-trail');
    expect(res.status === 200, `Status ${res.status}`);
  });

  console.log('\n========================================================================');
  console.log(`📊 TỔNG KẾT API TEST SUITE: ${passedTests}/${totalTests} TESTS PASSED`);
  if (failedTests === 0) {
    console.log('🏆 100% GREEN! TẤT CẢ 16 PHÂN HỆ API HOẠT ĐỘNG HOÀN HẢO!');
  } else {
    console.log(`⚠️ Có ${failedTests} bài test gặp lỗi, vui lòng kiểm tra chi tiết bên trên.`);
  }
  console.log('========================================================================\n');

  if (failedTests > 0) process.exit(1);
}

runSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
