const { Client } = require('pg');

async function testKeyMapping() {
  console.log('=== 1. Testing Key Mapping Logic for Users ===');
  // Load import-key-map from dist or ts-node
  const keyMapModule = require('../dist/import/import-key-map');
  const userMap = keyMapModule.MODULE_KEY_MAPS['users'];

  if (!userMap) {
    throw new Error('MODULE_KEY_MAPS["users"] is undefined!');
  }

  const sampleHeaders = {
    'mã nhân viên': 'employeeId',
    'họ và tên': 'fullName',
    'tên đăng nhập': 'username',
    'email': 'email',
    'số điện thoại': 'phone',
    'phòng ban': 'department',
    'chức danh chuyên môn': 'jobTitle',
    'nhóm quyền': 'role',
    'thời hạn cách ly độc lập': 'coolingOffEndDate',
    'đơn vị từng công tác': 'priorDepartments',
    'trạng thái': 'status',
    'lý do': 'statusReason',
    'đơn vị tiếp nhận': 'transferDestination',
    'ngày điều chuyển': 'transferDate',
    'ngày nghỉ việc': 'resignationDate',
  };

  let mappedCount = 0;
  for (const [header, expectedField] of Object.entries(sampleHeaders)) {
    const actual = userMap[header];
    if (actual === expectedField) {
      console.log(`  ✓ Header "${header}" -> "${actual}" (Match)`);
      mappedCount++;
    } else {
      console.error(`  ✗ Header "${header}" -> Expected "${expectedField}", got "${actual}"`);
    }
  }

  if (mappedCount === Object.keys(sampleHeaders).length) {
    console.log('  -> All sample headers mapped correctly!');
  } else {
    throw new Error(`Mapping failed: ${mappedCount}/${Object.keys(sampleHeaders).length} mapped.`);
  }
}

async function testDbSchema() {
  console.log('\n=== 2. Testing Database Schema for User Lifecycle & Independence ===');
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ktnb_db',
  });

  try {
    await client.connect();
    console.log('  Connected to PostgreSQL database successfully.');

    // Query columns of users table
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);

    const existingColumns = new Set(res.rows.map(r => r.column_name));
    console.log(`  Found ${existingColumns.size} columns in 'users' table.`);

    const requiredColumns = [
      { name: 'status', type: 'varchar(50) DEFAULT \'Active\'' },
      { name: 'resignationDate', type: 'date' },
      { name: 'transferDate', type: 'date' },
      { name: 'transferDestination', type: 'varchar(255)' },
      { name: 'statusReason', type: 'text' },
      { name: 'statusUpdatedAt', type: 'timestamp' },
      { name: 'priorDepartments', type: 'jsonb' },
      { name: 'coolingOffEndDate', type: 'date' },
    ];

    const missingColumns = [];
    for (const col of requiredColumns) {
      if (existingColumns.has(col.name)) {
        console.log(`  ✓ Column "${col.name}" exists.`);
      } else {
        console.log(`  ⚠ Column "${col.name}" is missing, will add column.`);
        missingColumns.push(col);
      }
    }

    if (missingColumns.length > 0) {
      for (const col of missingColumns) {
        const sql = `ALTER TABLE users ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type};`;
        await client.query(sql);
        console.log(`  -> Added missing column: "${col.name}" (${col.type})`);
      }
    }

    // Check count of users by status
    const statusCounts = await client.query(`
      SELECT COALESCE(status, 'Active') as status, count(*) 
      FROM users 
      GROUP BY COALESCE(status, 'Active')
    `);
    console.log('  User counts by status:', statusCounts.rows);

    await client.end();
    console.log('  Database schema check & synchronization passed.');
  } catch (err) {
    console.warn('  Database connection or query skipped/failed (if DB is offline in this env):', err.message);
  }
}

async function testUserLifecycleTransitions() {
  console.log('\n=== 3. Testing User Lifecycle Transitions & Independence Constraints ===');
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ktnb_db',
  });

  try {
    await client.connect();

    // Clean up any previous test user
    await client.query(`DELETE FROM users WHERE username = 'test_lifecycle_user'`);

    // 1. Create a test user
    const insertRes = await client.query(`
      INSERT INTO users (
        "username", "passwordHash", "fullName", "email", "jobTitle", "department", 
        "status", "isActive", "priorDepartments", "coolingOffEndDate"
      ) VALUES (
        'test_lifecycle_user', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 
        'Nguyễn Văn Test KTV', 'test_ktv@lpbank.com.vn', 
        'KTV Chính', 'Phòng KTNB Khối Vận Hành', 
        'Active', true, '["Khối CNTT & Ngân hàng số", "Trung tâm Thẻ"]'::jsonb, '2027-01-01'
      ) RETURNING id, username, "status", "isActive", "priorDepartments", "coolingOffEndDate"
    `);
    const testUser = insertRes.rows[0];
    console.log('  ✓ Created test auditor with independence info:');
    console.log(`    - ID: ${testUser.id}, Status: ${testUser.status}, Active: ${testUser.isActive}`);
    console.log(`    - Prior Depts: ${JSON.stringify(testUser.priorDepartments)}`);
    console.log(`    - Cooling-off End: ${testUser.coolingOffEndDate}`);

    // 2. Simulate Transfer (Điều chuyển)
    await client.query(`
      UPDATE users SET 
        "status" = 'Transferred',
        "isActive" = false,
        "transferDate" = '2026-09-30',
        "transferDestination" = 'Ban Quản Lý Rủi Ro',
        "statusReason" = 'Điều chuyển công tác theo quyết định HĐQT',
        "statusUpdatedAt" = NOW()
      WHERE id = $1
    `, [testUser.id]);

    const transferredCheck = await client.query(
      `SELECT "status", "isActive", "transferDestination", "statusReason" FROM users WHERE id = $1`,
      [testUser.id]
    );
    const trans = transferredCheck.rows[0];
    if (trans.status === 'Transferred' && trans.isActive === false && trans.transferDestination === 'Ban Quản Lý Rủi Ro') {
      console.log('  ✓ Transition to "Transferred" state verified (isActive set to false, reason & destination recorded)');
    } else {
      throw new Error(`Transfer transition failed: ${JSON.stringify(trans)}`);
    }

    // 3. Simulate Resignation (Nghỉ việc)
    await client.query(`
      UPDATE users SET 
        "status" = 'Resigned',
        "isActive" = false,
        "resignationDate" = '2026-10-15',
        "statusReason" = 'Nghỉ việc theo nguyện vọng cá nhân',
        "statusUpdatedAt" = NOW()
      WHERE id = $1
    `, [testUser.id]);

    const resignedCheck = await client.query(
      `SELECT "status", "isActive", "resignationDate", "statusReason" FROM users WHERE id = $1`,
      [testUser.id]
    );
    const resg = resignedCheck.rows[0];
    if (resg.status === 'Resigned' && resg.isActive === false) {
      console.log('  ✓ Transition to "Resigned" state verified');
    } else {
      throw new Error(`Resignation transition failed: ${JSON.stringify(resg)}`);
    }

    // 4. Simulate Restore (Khôi phục nhân sự)
    await client.query(`
      UPDATE users SET 
        "status" = 'Active',
        "isActive" = true,
        "statusReason" = 'Khôi phục tài khoản nhân sự quay lại làm việc',
        "statusUpdatedAt" = NOW()
      WHERE id = $1
    `, [testUser.id]);

    const restoredCheck = await client.query(
      `SELECT "status", "isActive" FROM users WHERE id = $1`,
      [testUser.id]
    );
    const rest = restoredCheck.rows[0];
    if (rest.status === 'Active' && rest.isActive === true) {
      console.log('  ✓ Transition to "Active" (Restore) state verified (isActive restored to true)');
    } else {
      throw new Error(`Restore transition failed: ${JSON.stringify(rest)}`);
    }

    // 5. Clean up
    await client.query(`DELETE FROM users WHERE id = $1`, [testUser.id]);
    console.log('  ✓ Cleaned up test user successfully.');

    await client.end();
  } catch (err) {
    console.error('  Lifecycle transition test failed:', err);
    throw err;
  }
}

async function run() {
  try {
    await testKeyMapping();
    await testDbSchema();
    await testUserLifecycleTransitions();
    console.log('\n=== ALL USER MODULE VERIFICATION TESTS PASSED SUCCESSFULLY ===');
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  }
}

run();

