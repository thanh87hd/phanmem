const { Client } = require('f:/Phan mem KTNB 4.0/backend/node_modules/pg');
const bcrypt = require('f:/Phan mem KTNB 4.0/backend/node_modules/bcrypt');

const DB_CONFIGS = [
  { name: 'Local', host: 'localhost', port: 5432, user: 'ktnb', password: 'ktnb_password_prod', database: 'ktnb_v4' },
];

async function setupUsersForDb(config) {
  console.log(`\n=== Setting up UAT test accounts on [${config.name}] ===`);
  const client = new Client(config);
  try {
    await client.connect();
    
    // Hash password
    const passwordHash = await bcrypt.hash('@Lpbank2026!', 10);

    // Get roles
    const rolesRes = await client.query('SELECT id, name FROM roles');
    const roleMap = {};
    rolesRes.rows.forEach(r => roleMap[r.name] = r.id);

    // Ensure Auditee and BKS and Admin accounts
    const uatAccounts = [
      {
        username: 'bks.chair',
        fullName: 'Nguyễn Văn Kiểm (Trưởng BKS)',
        email: 'bks.chair@lpbank.com.vn',
        phone: '0912.888.999',
        jobTitle: 'Trưởng Ban kiểm soát',
        department: 'Ban kiểm soát',
        roleName: 'Trưởng Ban kiểm soát',
        status: 'Active',
        isActive: true,
      },
      {
        username: 'bks.member',
        fullName: 'Lê Thị Soát (Thành viên BKS chuyên trách)',
        email: 'bks.member@lpbank.com.vn',
        phone: '0913.777.888',
        jobTitle: 'Thành viên Ban kiểm soát',
        department: 'Ban kiểm soát',
        roleName: 'Thành viên Ban kiểm soát',
        status: 'Active',
        isActive: true,
      },
      {
        username: 'hanoibm',
        fullName: 'Trần Quốc Tuấn (Giám đốc CN Hà Nội)',
        email: 'tuan.tq@lpbank.com.vn',
        phone: '0903.111.222',
        jobTitle: 'Giám đốc Chi nhánh',
        department: 'Chi nhánh Hà Nội',
        roleName: 'Đơn vị được kiểm toán',
        status: 'Active',
        isActive: true,
      },
      {
        username: 'saigonbm',
        fullName: 'Trịnh Minh Đức (Giám đốc CN Sài Gòn)',
        email: 'duc.tm@lpbank.com.vn',
        phone: '0908.333.444',
        jobTitle: 'Giám đốc Chi nhánh',
        department: 'Chi nhánh Sài Gòn',
        roleName: 'Đơn vị được kiểm toán',
        status: 'Active',
        isActive: true,
      },
      {
        username: 'auditor.ad',
        fullName: 'Vũ Quản Trị (Quản trị viên Hệ thống)',
        email: 'auditor.ad@lpbank.com.vn',
        phone: '0909.555.666',
        jobTitle: 'Quản trị viên An ninh & Phân quyền',
        department: 'Phòng Công nghệ',
        roleName: 'Admin',
        status: 'Active',
        isActive: true,
      },
    ];

    for (const acc of uatAccounts) {
      const roleId = roleMap[acc.roleName] || roleMap['Admin'] || 1;
      const existRes = await client.query('SELECT id FROM users WHERE username = $1', [acc.username]);
      if (existRes.rows.length > 0) {
        await client.query(`
          UPDATE users 
          SET "fullName" = $1, "passwordHash" = $2, "roleId" = $3, "jobTitle" = $4, department = $5, "isActive" = true, status = 'Active', "mustChangePassword" = false
          WHERE username = $6
        `, [acc.fullName, passwordHash, roleId, acc.jobTitle, acc.department, acc.username]);
        console.log(`Updated user: ${acc.username} (${acc.roleName})`);
      } else {
        await client.query(`
          INSERT INTO users (username, "passwordHash", "fullName", email, phone, "jobTitle", department, "roleId", "isActive", status, "mustChangePassword")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, 'Active', false)
        `, [acc.username, passwordHash, acc.fullName, acc.email, acc.phone, acc.jobTitle, acc.department, roleId]);
        console.log(`Created user: ${acc.username} (${acc.roleName})`);
      }
    }

    console.log(`[${config.name}] Setup UAT users successfully.`);
    await client.end();
  } catch (err) {
    console.error(`Error on ${config.name}:`, err.message);
  }
}

async function main() {
  for (const cfg of DB_CONFIGS) {
    await setupUsersForDb(cfg);
  }
}

main().catch(console.error);
