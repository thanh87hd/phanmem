const { Client } = require('/var/www/phanmem/backend/node_modules/pg');
const bcrypt = require('/var/www/phanmem/backend/node_modules/bcrypt');

async function run() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'ktnb',
    password: 'ktnb@2026',
    database: 'ktnb_db'
  });
  await client.connect();
  const passwordHash = await bcrypt.hash('@Lpbank2026!', 10);
  const rolesRes = await client.query('SELECT id, name FROM roles');
  const roleMap = {};
  rolesRes.rows.forEach(r => roleMap[r.name] = r.id);

  const uatAccounts = [
    { username: 'bks.chair', fullName: 'Nguyễn Văn Kiểm (Trưởng BKS)', email: 'bks.chair@lpbank.com.vn', phone: '0912.888.999', jobTitle: 'Trưởng Ban kiểm soát', department: 'Ban kiểm soát', roleName: 'Trưởng Ban kiểm soát' },
    { username: 'bks.member', fullName: 'Lê Thị Soát (Thành viên BKS chuyên trách)', email: 'bks.member@lpbank.com.vn', phone: '0913.777.888', jobTitle: 'Thành viên Ban kiểm soát', department: 'Ban kiểm soát', roleName: 'Thành viên Ban kiểm soát' },
    { username: 'hanoibm', fullName: 'Trần Quốc Tuấn (Giám đốc CN Hà Nội)', email: 'tuan.tq@lpbank.com.vn', phone: '0903.111.222', jobTitle: 'Giám đốc Chi nhánh', department: 'Chi nhánh Hà Nội', roleName: 'Đơn vị được kiểm toán' },
    { username: 'saigonbm', fullName: 'Trịnh Minh Đức (Giám đốc CN Sài Gòn)', email: 'duc.tm@lpbank.com.vn', phone: '0908.333.444', jobTitle: 'Giám đốc Chi nhánh', department: 'Chi nhánh Sài Gòn', roleName: 'Đơn vị được kiểm toán' },
    { username: 'auditor.ad', fullName: 'Vũ Quản Trị (Quản trị viên Hệ thống)', email: 'auditor.ad@lpbank.com.vn', phone: '0909.555.666', jobTitle: 'Quản trị viên An ninh & Phân quyền', department: 'Phòng Công nghệ', roleName: 'Admin' },
  ];

  for (const acc of uatAccounts) {
    const roleId = roleMap[acc.roleName] || roleMap['Admin'] || 16;
    const existRes = await client.query('SELECT id FROM users WHERE username = $1', [acc.username]);
    if (existRes.rows.length > 0) {
      await client.query(`
        UPDATE users 
        SET "fullName" = $1, "passwordHash" = $2, "roleId" = $3, "jobTitle" = $4, department = $5, "isActive" = true, status = 'Active', "mustChangePassword" = false
        WHERE username = $6
      `, [acc.fullName, passwordHash, roleId, acc.jobTitle, acc.department, acc.username]);
      console.log('VPS Updated: ' + acc.username);
    } else {
      await client.query(`
        INSERT INTO users (username, "passwordHash", "fullName", email, phone, "jobTitle", department, "roleId", "isActive", status, "mustChangePassword")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, 'Active', false)
      `, [acc.username, passwordHash, acc.fullName, acc.email, acc.phone, acc.jobTitle, acc.department, roleId]);
      console.log('VPS Created: ' + acc.username);
    }
  }
  await client.end();
  console.log('VPS UAT users ready!');
}
run().catch(console.error);
