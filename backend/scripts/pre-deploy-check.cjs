/**
 * KIỂM TRA TRƯỚC KHI DEPLOY (READ-ONLY) — chạy TRÊN VPS, KHÔNG sửa dữ liệu.
 *
 *   cd /var/www/phanmem/backend && node scripts/pre-deploy-check.cjs
 *
 * Thực hiện 3 việc mà kế hoạch yêu cầu trước khi chạy migration:
 *   1. PRE-FLIGHT cột `audit_engagements."teamMembers"`: liệt kê giá trị KHÔNG
 *      phải JSON hợp lệ — nếu có, `ALTER ... USING ::jsonb` sẽ thất bại và chặn
 *      cả deploy (CI nay fail cứng khi migration lỗi).
 *   2. DRY-RUN trạng thái kiến nghị: in danh sách (id, cũ -> mới) mà migration
 *      `NormalizeRecommendationStatus` SẼ ghi, để rà soát thủ công TRƯỚC khi
 *      UPDATE dữ liệu thật.
 *   3. Tổng quan dữ liệu để đối chiếu trước/sau (dashboard/stats).
 *
 * KHÔNG chạy UPDATE/ALTER. Thoát mã 1 nếu phát hiện vấn đề chặn deploy.
 *
 * Đọc cấu hình từ `.env` cùng thư mục (DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_NAME)
 * — trên VPS các biến này trỏ tới DB production.
 */
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const VALID_STATUSES = ['NotStarted', 'InProgress', 'Completed', 'Overdue', 'Verified'];

async function main() {
  const env = loadEnv();
  let pg;
  try {
    pg = require('pg');
  } catch {
    console.error('Không tìm thấy module "pg". Chạy: npm ci --omit=dev');
    process.exit(1);
  }

  const cfg = {
    host: process.env.DB_HOST || env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || env.DB_PORT || 5432),
    user: process.env.DB_USERNAME || env.DB_USERNAME || 'ktnb_user',
    password: process.env.DB_PASSWORD || env.DB_PASSWORD || '',
    database: process.env.DB_NAME || env.DB_NAME || 'ktnb_db',
  };

  const c = new pg.Client(cfg);
  await c.connect();
  console.log('Đã kết nối DB: ' + cfg.user + '@' + cfg.host + ':' + cfg.port + '/' + cfg.database);
  console.log('Thời điểm: ' + new Date().toISOString() + '\n');

  let blocking = 0;

  // ---------- 1. PRE-FLIGHT: teamMembers ----------
  console.log('═══ 1. PRE-FLIGHT cột audit_engagements."teamMembers" ═══');
  const col = await c.query(
    `select data_type from information_schema.columns
      where table_schema = current_schema() and table_name = 'audit_engagements' and column_name = 'teamMembers'`,
  );
  const dataType = col.rows[0] && col.rows[0].data_type;
  console.log('  Kiểu cột hiện tại: ' + (dataType || '(KHÔNG TÌM THẤY CỘT)'));
  if (!dataType) {
    console.log('  ⚠️  Không tìm thấy cột — kiểm tra lại tên bảng/schema.');
    blocking++;
  } else if (dataType === 'jsonb') {
    console.log('  ✅ Đã là jsonb — migration ConvertTeamMembersToJsonb sẽ bỏ qua (idempotent).');
  } else {
    // Phân loại bằng CHÍNH PostgreSQL (pg_input_is_valid, PG>=16) thay vì regex:
    // regex '^[\[{]' báo nhầm chuỗi JSON scalar hợp lệ (vd '"Tên KTV"') thành rác.
    let cls;
    try {
      cls = (
        await c.query(`select
            count(*) filter (where "teamMembers" is not null
                                and not pg_input_is_valid("teamMembers"::text, 'jsonb')) as invalid_cnt,
            count(*) filter (where "teamMembers" is not null
                                and pg_input_is_valid("teamMembers"::text, 'jsonb')
                                and jsonb_typeof("teamMembers"::jsonb) <> 'array') as nonarray_cnt
          from audit_engagements`)
      ).rows[0];
    } catch {
      // PostgreSQL < 16: dùng regex làm phương án dự phòng (chấp nhận báo nhầm scalar).
      cls = (
        await c.query(`select
            count(*) filter (where "teamMembers" is not null
                                and btrim("teamMembers"::text) not in ('', 'null')
                                and btrim("teamMembers"::text) !~ '^[\\[\\{]') as invalid_cnt,
            0 as nonarray_cnt
          from audit_engagements`)
      ).rows[0];
    }

    if (Number(cls.invalid_cnt) > 0) {
      const bad = await c.query(
        `select id, left("teamMembers"::text, 120) as sample
           from audit_engagements
          where "teamMembers" is not null
            and not pg_input_is_valid("teamMembers"::text, 'jsonb')
          order by id`,
      );
      console.log('  ❌ CÓ ' + bad.rowCount + ' GIÁ TRỊ KHÔNG PHẢI JSON → ALTER SẼ THẤT BẠI:');
      for (const r of bad.rows) console.log('     id=' + r.id + '  ' + JSON.stringify(r.sample));
      console.log('     ⇒ Phải sửa dữ liệu này TRƯỚC khi chạy migration.');
      blocking++;
    } else {
      console.log('  ✅ 0 giá trị hỏng — ALTER ... USING ::jsonb sẽ chạy được.');
    }

    if (Number(cls.nonarray_cnt) > 0) {
      console.log('  ⚠️  ' + cls.nonarray_cnt + ' dòng là JSON hợp lệ nhưng KHÔNG phải mảng (jsonb_typeof <> \'array\').');
      console.log('     ALTER vẫn chạy được và các dòng này "fail-closed" (không khớp bất kỳ userId nào),');
      console.log('     NHƯNG người trong nhóm đoàn sẽ MẤT quyền truy cập dữ liệu đoàn đó. Cần xử lý dữ liệu:');
      const sample = await c.query(
        `select id, left("teamMembers"::text, 90) as sample
           from audit_engagements
          where "teamMembers" is not null
            and pg_input_is_valid("teamMembers"::text, 'jsonb')
            and jsonb_typeof("teamMembers"::jsonb) <> 'array'
          order by id limit 10`,
      );
      for (const r of sample.rows) console.log('       id=' + r.id + '  ' + JSON.stringify(r.sample));
      console.log('     ⇒ Gán lại thành mảng [{"userId": <id>}] nếu muốn giữ quyền truy cập.');
    }
  }

  // ---------- 2. DRY-RUN: trạng thái kiến nghị ----------
  console.log('\n═══ 2. DRY-RUN chuẩn hoá trạng thái kiến nghị (KHÔNG ghi) ═══');
  const dist = await c.query(
    `select coalesce(status, '(NULL)') as status, count(*)::int as n
       from recommendations group by 1 order by 2 desc`,
  );
  console.log('  Phân bố hiện tại:');
  for (const r of dist.rows) console.log('    ' + JSON.stringify(r.status) + '  x' + r.n);

  const dry = await c.query(
    `select id, status as cu, "closureStatus" as closure, "progressPercent" as pct, "dueDate" as due,
            case
              when coalesce("progressPercent", 0) >= 100 then 'Completed'
              when coalesce("progressPercent", 0) > 0    then 'InProgress'
              when "dueDate" is not null
                   and "dueDate" ~ '^\\d{4}-\\d{2}-\\d{2}'
                   and "dueDate"::date < current_date   then 'Overdue'
              else 'NotStarted'
            end as moi
       from recommendations
      where status is null or status <> all($1::text[])
      order by id`,
    [VALID_STATUSES],
  );

  if (dry.rowCount === 0) {
    console.log('  ✅ Không có bản ghi nào ngoài enum — migration sẽ không thay đổi gì.');
  } else {
    console.log('  SẼ THAY ĐỔI ' + dry.rowCount + ' BẢN GHI (rà soát kỹ trước khi chạy):');
    console.log('     id | trạng thái cũ              | closureStatus          | pct  | dueDate    | -> mới');
    console.log('     ---+----------------------------+------------------------+------+------------+--------');
    for (const r of dry.rows) {
      const pad = (s, n) => String(s === null ? 'NULL' : s).padEnd(n).slice(0, n);
      console.log('     ' + pad(r.id, 3) + '| ' + pad(r.cu, 27) + '| ' + pad(r.closure, 23) + '| ' + pad(r.pct, 5) + '| ' + pad(r.due, 11) + '| -> ' + r.moi);
    }
    console.log('  ℹ️  Ghi lại bảng trên để đối chiếu sau khi deploy.');
  }

  // ---------- 3. TỔNG QUAN ĐỐI CHIẾU ----------
  console.log('\n═══ 3. TỔNG QUAN DỮ LIỆU (đối chiếu trước/sau deploy) ═══');
  const counts = await c.query(`
    select
      (select count(*)::int from audit_engagements) as engagements,
      (select count(*)::int from audit_findings)    as findings,
      (select count(*)::int from recommendations)   as recommendations,
      (select count(*)::int from working_papers)    as working_papers,
      (select count(*)::int from regulatory_exams)  as regulatory_exams`);
  const k = counts.rows[0];
  console.log('  Đoàn kiểm toán: ' + k.engagements + ' | Phát hiện: ' + k.findings +
              ' | Kiến nghị: ' + k.recommendations + ' | WP: ' + k.working_papers +
              ' | Đợt thanh tra: ' + k.regulatory_exams);

  const auth = await c.query('select distinct authority from regulatory_exams order by 1');
  if (auth.rowCount) {
    console.log('  Giá trị authority đang có: ' + auth.rows.map((r) => JSON.stringify(r.authority)).join(', '));
    const legacy = auth.rows.filter((r) => r.authority && !['NHNN', 'KTNN', 'Thue', 'BoCongAn', 'Khac'].includes(r.authority));
    if (legacy.length) {
      console.log('  ⚠️  Có ' + legacy.length + ' giá trị authority KHÔNG thuộc danh mục mã mới (dữ liệu cũ do form lưu nhãn tiếng Việt).');
      console.log('     Bộ lọc "Cơ quan" trên UI sẽ không khớp các bản ghi này cho tới khi chuẩn hoá.');
    }
  }

  await c.end();
  console.log('\n═══ KẾT LUẬN: ' + (blocking === 0
    ? 'SẴN SÀNG DEPLOY ✅'
    : 'CÓ ' + blocking + ' VẤN ĐỀ CHẶN DEPLOY ❌ — xử lý trước khi chạy migration') + ' ═══');
  process.exit(blocking === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('LỖI:', e.message);
  process.exit(1);
});
