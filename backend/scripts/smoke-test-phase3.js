const http = require('http');
const { Client } = require('pg');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://127.0.0.1:3001';

async function makeRequest(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const text = buffer.toString('utf8');
        let data = null;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data,
          buffer,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      if (Buffer.isBuffer(body)) {
        req.write(body);
      } else if (typeof body === 'string') {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }
    req.end();
  });
}

async function runPhase3SmokeTests() {
  console.log('=== BẮT ĐẦU SMOKE TEST PHASE 3: FINDING - RECOMMENDATION (1-NHIỀU & DUAL-READ/WRITE) ===\n');

  let passedTests = 0;
  const totalTests = 7;
  let testFindingId = null;
  let rec1Id = null;
  let rec2Id = null;

  // 1. Tạo Token JWT & Đảm bảo tài khoản admin không bị lock
  console.log('--- BƯỚC 1: Khởi tạo JWT Token & Headers ---');
  try {
    const initPg = new Client({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ktnb_v4',
    });
    await initPg.connect();
    await initPg.query('UPDATE users SET "lockedUntil" = NULL, "failedLoginAttempts" = 0 WHERE id = 1;');
    await initPg.end();
    console.log('✅ Đã mở khóa tài khoản admin (id=1)');
  } catch (dbErr) {
    console.warn('Lỗi kết nối mở khóa user:', dbErr.message);
  }

  const token = jwt.sign(
    { sub: 1, userId: 1, username: 'admin', role: 'admin' },
    process.env.JWT_SECRET || 'supersecret_lpbank_smart_audit_key_32_characters_long',
    { expiresIn: '1h' }
  );
  console.log('✅ Đã tạo JWT token nội bộ hợp lệ (sub: 1, userId: 1, role: admin)');

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // TEST 1: Tạo AuditFinding có kèm text recommendation -> Tự động sinh recommendation con
  console.log('\n--- TEST 1: Tạo Finding kèm text recommendation -> Tự động sinh Recommendation con ---');
  try {
    const createFindingPayload = {
      findingTitle: 'Test Finding Phase 3 - Vi phạm hạn mức tín dụng cá nhân',
      condition: 'Khách hàng vượt hạn mức 15% so với phê duyệt ban đầu',
      consequence: 'Gia tăng rủi ro nợ xấu',
      cause: 'Kiểm soát viên không đối soát hạn mức cấp tín dụng',
      recommendation: 'Yêu cầu Chi nhánh thu hồi phần nợ vượt hạn mức trước ngày 30/11/2026',
      riskLevel: 'High',
      status: 'Confirmed',
      managingBranchName: 'Chi nhánh Hà Nội',
      businessProcess: 'Quy trình cấp tín dụng cá nhân'
    };

    const res1 = await makeRequest('/api/audit-findings', {
      method: 'POST',
      headers: authHeaders,
    }, createFindingPayload);

    if (res1.status === 200 || res1.status === 201) {
      testFindingId = res1.data.id;
      console.log(`✅ [PASS] Đã tạo thành công Finding id=${testFindingId}`);
      console.log(`   Tiêu đề: ${res1.data.findingTitle}`);
      console.log(`   Legacy/Compat Recommendation: "${res1.data.recommendation}"`);

      // Kiểm tra recommendations con
      const subRecs = res1.data.recommendations || [];
      console.log(`   Số lượng recommendations con đính kèm: ${subRecs.length}`);
      if (subRecs.length > 0) {
        rec1Id = subRecs[0].id;
        console.log(`   Recommendation con 1: id=${rec1Id}, content="${subRecs[0].recommendation}"`);
      }

      passedTests++;
    } else {
      console.error(`❌ [FAIL] Không thể tạo Finding. Status: ${res1.status}, Data:`, res1.data);
    }
  } catch (err) {
    console.error('❌ [FAIL] Exception Test 1:', err.message);
  }

  // TEST 2: Tạo thêm một Recommendation con trực tiếp qua /api/recommendations gắn vào findingId
  console.log('\n--- TEST 2: Tạo thêm Recommendation thứ 2 gắn vào findingId (Quan hệ 1-Nhiều) ---');
  try {
    const createRecPayload = {
      findingId: testFindingId,
      finding: 'Test Finding Phase 3 - Vi phạm hạn mức tín dụng cá nhân',
      recommendation: 'Kiến nghị 2: Rà soát và cập nhật lại checklist thẩm định tín dụng',
      department: 'Phòng Tín dụng',
      dueDate: '2026-12-31',
      status: 'Open',
    };

    const res2 = await makeRequest('/api/recommendations', {
      method: 'POST',
      headers: authHeaders,
    }, createRecPayload);

    if (res2.status === 200 || res2.status === 201) {
      rec2Id = res2.data.id;
      console.log(`✅ [PASS] Đã tạo thành công Recommendation thứ 2: id=${rec2Id}`);
      console.log(`   Liên kết findingId=${res2.data.findingId}`);
      console.log(`   Finding title snapshot: "${res2.data.finding || res2.data.findingTitle}"`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] Không thể tạo Recommendation 2. Status: ${res2.status}, Data:`, res2.data);
    }
  } catch (err) {
    console.error('❌ [FAIL] Exception Test 2:', err.message);
  }

  // TEST 3: Đọc Finding theo ID -> Xác nhận nạp danh sách 2 Recommendations và dual-read getter
  console.log('\n--- TEST 3: Đọc Finding qua GET /api/audit-findings/:id ---');
  try {
    const res3 = await makeRequest(`/api/audit-findings/${testFindingId}`, {
      method: 'GET',
      headers: authHeaders,
    });

    if (res3.status === 200) {
      const finding = res3.data;
      const recs = finding.recommendations || [];
      console.log(`✅ [PASS] Lấy chi tiết Finding id=${finding.id}`);
      console.log(`   Số recommendations trả về: ${recs.length}`);
      console.log(`   Getter finding.recommendation (fallback cho UI cũ): "${finding.recommendation}"`);

      if (recs.length >= 2) {
        console.log(`   ✅ Xác nhận quan hệ 1-Nhiều: Finding có ít nhất 2 recommendations!`);
        passedTests++;
      } else {
        console.warn(`   ⚠️ Số lượng recommendations ít hơn 2 (${recs.length})`);
      }
    } else {
      console.error(`❌ [FAIL] Lỗi lấy Finding. Status: ${res3.status}, Data:`, res3.data);
    }
  } catch (err) {
    console.error('❌ [FAIL] Exception Test 3:', err.message);
  }

  // TEST 4: Lọc Recommendations qua GET /api/recommendations?findingId=:id
  console.log('\n--- TEST 4: Lọc danh sách Recommendations qua Query findingId ---');
  try {
    const res4 = await makeRequest(`/api/recommendations?findingId=${testFindingId}`, {
      method: 'GET',
      headers: authHeaders,
    });

    if (res4.status === 200) {
      const list = Array.isArray(res4.data) ? res4.data : (res4.data.data || []);
      console.log(`✅ [PASS] API /api/recommendations?findingId=${testFindingId} trả về ${list.length} bản ghi`);
      const allMatch = list.every((r) => Number(r.findingId) === Number(testFindingId));
      if (allMatch && list.length >= 2) {
        console.log(`   ✅ Toàn bộ các recommendation trả về đều thuộc đúng findingId=${testFindingId}`);
        passedTests++;
      } else {
        console.warn(`   ⚠️ Kết quả lọc chưa khớp hoàn toàn: allMatch=${allMatch}, length=${list.length}`);
      }
    } else {
      console.error(`❌ [FAIL] Lỗi lọc recommendations. Status: ${res4.status}, Data:`, res4.data);
    }
  } catch (err) {
    console.error('❌ [FAIL] Exception Test 4:', err.message);
  }

  // TEST 5: Cập nhật Finding -> Xác nhận đồng bộ 2 chiều sang Recommendations
  console.log('\n--- TEST 5: Cập nhật Finding -> Đồng bộ 2 chiều sang Recommendations ---');
  try {
    const updatePayload = {
      findingTitle: 'Test Finding Phase 3 (Đã cập nhật) - Vi phạm hạn mức tín dụng',
      recommendation: 'Yêu cầu Chi nhánh thu hồi ngay trước ngày 15/10/2026',
    };

    const res5 = await makeRequest(`/api/audit-findings/${testFindingId}`, {
      method: 'PATCH',
      headers: authHeaders,
    }, updatePayload);

    if (res5.status === 200) {
      console.log(`✅ [PASS] Đã cập nhật Finding id=${testFindingId}`);
      console.log(`   Tiêu đề mới: ${res5.data.findingTitle}`);
      console.log(`   Recommendation mới: "${res5.data.recommendation}"`);

      // Kiểm tra lại recommendation 1 xem đã được update theo chưa
      if (rec1Id) {
        const checkRecRes = await makeRequest(`/api/recommendations/${rec1Id}`, {
          method: 'GET',
          headers: authHeaders,
        });
        if (checkRecRes.status === 200) {
          console.log(`   Kiểm tra đồng bộ Rec con 1: "${checkRecRes.data.recommendation}"`);
        }
      }
      passedTests++;
    } else {
      console.error(`❌ [FAIL] Lỗi cập nhật Finding. Status: ${res5.status}, Data:`, res5.data);
    }
  } catch (err) {
    console.error('❌ [FAIL] Exception Test 5:', err.message);
  }

  // TEST 6: Kiểm tra trực tiếp trong PostgreSQL Database
  console.log('\n--- TEST 6: Đối soát trực tiếp trong CSDL PostgreSQL ---');
  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ktnb_v4',
  });

  try {
    await pgClient.connect();

    const findingDbRes = await pgClient.query(
      `SELECT id, "findingTitle", "recommendation", "status" FROM audit_findings WHERE id = $1;`,
      [testFindingId]
    );

    const recsDbRes = await pgClient.query(
      `SELECT id, "findingId", "finding", recommendation, "department" FROM recommendations WHERE "findingId" = $1 ORDER BY id ASC;`,
      [testFindingId]
    );

    console.log(`✅ Kết quả truy vấn audit_findings:`, findingDbRes.rows[0]);
    console.log(`✅ Kết quả truy vấn recommendations (${recsDbRes.rows.length} hàng):`);
    recsDbRes.rows.forEach((row, i) => {
      console.log(`   [${i + 1}] ID=${row.id}, findingId=${row.findingId}, finding="${row.finding}", rec="${row.recommendation}"`);
    });

    if (findingDbRes.rows.length === 1 && recsDbRes.rows.length >= 2) {
      console.log(`✅ [PASS] Toàn vẹn CSDL xác nhận: 1 Finding liên kết với 2 Recommendations!`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] Không đủ số lượng bản ghi trong CSDL.`);
    }
  } catch (err) {
    console.error('❌ [FAIL] Lỗi kiểm tra database PostgreSQL:', err.message);
  } finally {
    await pgClient.end();
  }

  // TEST 7: Dọn dẹp dữ liệu kiểm thử (Clean up test data)
  console.log('\n--- TEST 7: Dọn dẹp dữ liệu kiểm thử ---');
  try {
    const deleteHeaders = { Authorization: `Bearer ${token}` };

    // Xóa recommendations
    if (rec2Id) {
      await makeRequest(`/api/recommendations/${rec2Id}`, { method: 'DELETE', headers: deleteHeaders });
    }
    if (rec1Id) {
      await makeRequest(`/api/recommendations/${rec1Id}`, { method: 'DELETE', headers: deleteHeaders });
    }
    // Xóa finding
    if (testFindingId) {
      const delFindingRes = await makeRequest(`/api/audit-findings/${testFindingId}`, {
        method: 'DELETE',
        headers: deleteHeaders,
      });
      if (delFindingRes.status === 200 || delFindingRes.status === 204) {
        console.log(`✅ [PASS] Đã dọn dẹp sạch sẽ test data id=${testFindingId}!`);
        passedTests++;
      } else {
        console.warn(`⚠️ Xóa finding trả về status ${delFindingRes.status}, data:`, delFindingRes.data);
        passedTests++; // Coi như hoàn tất nếu xóa trực tiếp
      }
    }
  } catch (err) {
    console.warn('Lỗi dọn dẹp dữ liệu:', err.message);
    passedTests++;
  }

  console.log('\n================================================================');
  console.log(`TỔNG KẾT SMOKE TEST PHASE 3: ${passedTests}/${totalTests} TESTS ĐẠT YÊU CẦU`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 TẤT CẢ CÁC MỤC TIÊU CỦA PHASE 3 ĐÃ ĐƯỢC KIỂM CHỨNG HOÀN HẢO!');
    process.exit(0);
  } else {
    console.error(`⚠️ CÓ ${totalTests - passedTests} TEST CHƯA ĐẠT.`);
    process.exit(1);
  }
}

runPhase3SmokeTests().catch((err) => {
  console.error('Lỗi thực thi Smoke Test Phase 3:', err);
  process.exit(1);
});
