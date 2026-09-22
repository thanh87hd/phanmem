const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'ktnb_v4',
});

async function main() {
  await client.connect();
  console.log('Connected to PostgreSQL database: ktnb_v4');

  // 1. Lấy tất cả bảng trong schema public
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const tables = tablesRes.rows.map((r) => r.table_name);
  console.log(`Found ${tables.length} tables in database.`);

  const baseline = {
    generatedAt: new Date().toISOString(),
    totalTables: tables.length,
    tables: {},
  };

  let mdReport = `# BÁO CÁO SNAPSHOT SCHEMA & SỐ LƯỢNG BẢN GHI (BASELINE)\n`;
  mdReport += `**Thời điểm tạo:** ${baseline.generatedAt}\n`;
  mdReport += `**Database:** ktnb_v4 (PostgreSQL)\n`;
  mdReport += `**Tổng số bảng:** ${tables.length}\n\n`;
  mdReport += `| STT | Tên Bảng | Số Bản Ghi (Rows) | Số Cột | Khóa Chính (PK) |\n`;
  mdReport += `| :---: | :--- | :---: | :---: | :--- |\n`;

  let idx = 1;
  for (const table of tables) {
    try {
      // Đếm số dòng
      const countRes = await client.query(`SELECT COUNT(*) as count FROM "${table}";`);
      const rowCount = parseInt(countRes.rows[0].count, 10);

      // Lấy danh sách cột
      const colsRes = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [table]);

      // Lấy primary key
      const pkRes = await client.query(`
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = $1;
      `, [table]);

      const pks = pkRes.rows.map(r => r.column_name).join(', ');

      baseline.tables[table] = {
        rowCount,
        columnCount: colsRes.rows.length,
        primaryKey: pks,
        columns: colsRes.rows,
      };

      mdReport += `| ${idx++} | \`${table}\` | **${rowCount.toLocaleString()}** | ${colsRes.rows.length} | ${pks || 'None'} |\n`;
    } catch (err) {
      console.error(`Error querying table ${table}:`, err.message);
    }
  }

  // 2. Chi tiết 2 bảng mục tiêu Phase 1: audit_charters & kri_alerts
  mdReport += `\n---\n\n## CHI TIẾT CÁC BẢNG TRỌNG TÂM PHASE 1\n\n`;

  for (const focusTable of ['audit_charters', 'kri_alerts']) {
    if (baseline.tables[focusTable]) {
      const info = baseline.tables[focusTable];
      mdReport += `### Bảng \`${focusTable}\` (Hiện có: ${info.rowCount} bản ghi)\n\n`;
      mdReport += `| Tên Cột | Kiểu Dữ Liệu | Cho Phép Null | Giá Trị Mặc Định |\n`;
      mdReport += `| :--- | :--- | :---: | :--- |\n`;
      for (const col of info.columns) {
        mdReport += `| \`${col.column_name}\` | \`${col.data_type}\` | ${col.is_nullable} | ${col.column_default || '-'} |\n`;
      }
      mdReport += `\n`;
    }
  }

  // Lưu files
  const outDir = path.resolve(__dirname, '../../docs/architecture');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(path.join(outDir, 'db_baseline_snapshot.json'), JSON.stringify(baseline, null, 2));
  fs.writeFileSync(path.join(outDir, 'DB_BASELINE_RECORD_COUNTS.md'), mdReport);

  console.log('Saved baseline snapshot to docs/architecture/db_baseline_snapshot.json and DB_BASELINE_RECORD_COUNTS.md');
  await client.end();
}

main().catch((err) => {
  console.error('Fatal error generating baseline:', err);
  process.exit(1);
});
