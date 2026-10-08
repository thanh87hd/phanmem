'use strict';
// A03:2021 - Injection
const { SEVERITY } = require('../lib/config');
const P = require('../lib/payloads');

const MODULE = { id: 'A03', name: 'Injection (SQLi, NoSQLi, XSS, SSTI, Command Injection)' };

const SQL_ERRORS = /SQL syntax|mysql_fetch|ORA-\d{5}|PostgreSQL.*ERROR|SQLite\/JDBC|Unclosed quotation mark|SequelizeDatabaseError|QueryFailedError|syntax error at or near|You have an error in your SQL/i;
const NOSQL_ERRORS = /MongoError|MongoServerError|CastError|BSONTypeError|unknown top level operator/i;
const CMD_MARKERS = /uid=\d+\(|root:x:0:0|\[boot loader\]|Microsoft Windows \[Version/i;

// Endpoint nhan tham so truy van de thu injection
function queryTargets(routes) {
  const out = [];
  for (const r of routes) {
    if (r.method !== 'GET') continue;
    if (/\/(health|metrics|swagger|docs)/.test(r.url)) continue;
    // Route co @Query (khong co :param trong path) hoac co :param
    out.push(r);
  }
  return out;
}

async function run(ctx) {
  const { anon, authed, baseUrl, report, routes } = ctx;
  const R = (sev, id, title, detail, extra) => report.fail(sev, id, title, detail, extra);
  const client = authed || anon;
  const targets = queryTargets(routes).slice(0, 60);
  const QUERY_KEYS = ['q', 'search', 'keyword', 'filter', 'name', 'code', 'id', 'sort', 'order', 'where', 'query', 'term'];

  let sqlHits = 0, xssHits = 0, cmdHits = 0, nosqlHits = 0;

  for (const r of targets) {
    for (const key of QUERY_KEYS.slice(0, 4)) {
      // BUOC 1: do duong co so voi dau vao BINH THUONG (tranh duong tinh gia:
      // nhieu endpoint hong san va tra loi CSDL voi moi dau vao)
      const baseUrlProbe = baseUrl + r.sampleUrl + (r.sampleUrl.includes('?') ? '&' : '?') + key + '=baseline_probe_value';
      const baseRes = await client.get(baseUrlProbe);
      if (!baseRes.ok) { report.error('A03-01', r.url + ': ' + baseRes.error); continue; }
      const baselineSqlError = SQL_ERRORS.test(baseRes.body);
      const baselineStatus = baseRes.status;

      // BUOC 2: chi ket luan SQLi khi payload gay loi CSDL MA baseline KHONG gay
      for (const payload of P.SQLI.slice(0, 8)) {
        const url = baseUrl + r.sampleUrl + (r.sampleUrl.includes('?') ? '&' : '?') + key + '=' + encodeURIComponent(payload);
        const res = await client.get(url);
        if (!res.ok) continue;
        const payloadSqlError = SQL_ERRORS.test(res.body);
        // Loi CSDL xuat hien voi payload nhung KHONG xuat hien voi dau vao binh thuong -> dau hieu that
        if (payloadSqlError && !baselineSqlError) {
          sqlHits++;
          R(SEVERITY.CRITICAL, 'A03-01', 'SQL Injection (loi CSDL chi xuat hien voi payload)', r.method + ' ' + r.url + ' voi tham so ' + key + '=' + payload + ' gay loi CSDL, trong khi dau vao binh thuong thi khong.',
            { url, evidence: String(res.body).slice(0, 300), remediation: 'Dung truy van tham so hoa (parameterized query) / ORM binding; khong noi chuoi SQL.' });
          break;
        }
        // Payload lam doi ma trang thai so voi baseline (vi du 200 -> 500) -> dang ngo
        if (!payloadSqlError && res.status >= 500 && baselineStatus < 500 && /syntax|query|column|relation/i.test(res.body)) {
          sqlHits++;
          R(SEVERITY.HIGH, 'A03-01', 'Dau vao lam thay doi hanh vi truy van', r.method + ' ' + r.url + ' voi ' + key + '=' + payload + ' gay HTTP ' + res.status + ' (binh thuong: ' + baselineStatus + ').',
            { url, evidence: String(res.body).slice(0, 300), remediation: 'Kiem tra lai viec xu ly dau vao; dung tham so hoa.' });
          break;
        }
      }
      if (sqlHits > 5) break;
    }
    if (sqlHits > 5) break;
  }
  if (!sqlHits) report.pass();

  // A03-02: XSS phan hoi (reflected)
  for (const r of targets.slice(0, 40)) {
    for (const payload of P.XSS.slice(0, 4)) {
      const url = baseUrl + r.sampleUrl + (r.sampleUrl.includes('?') ? '&' : '?') + 'q=' + encodeURIComponent(payload);
      const res = await client.get(url);
      if (!res.ok) continue;
      const ct = res.headers['content-type'] || '';
      if (!/html|xml|text/.test(ct)) continue;
      if (res.body.includes(payload) && !res.body.includes('&lt;script&gt;')) {
        xssHits++;
        R(SEVERITY.HIGH, 'A03-02', 'Reflected XSS', 'Payload phan hoi nguyen ven trong ' + r.url + ' (Content-Type: ' + ct + ').',
          { url, evidence: String(res.body).slice(0, 300), remediation: 'Ma hoa dau ra theo ngu canh HTML; dat Content-Type dung; bat CSP.' });
        break;
      }
    }
    if (xssHits > 5) break;
  }
  if (!xssHits) report.pass();

  // A03-03: Command injection (qua tham so)
  for (const r of targets.slice(0, 30)) {
    for (const payload of P.CMDI.slice(0, 4)) {
      const url = baseUrl + r.sampleUrl + (r.sampleUrl.includes('?') ? '&' : '?') + 'name=' + encodeURIComponent(payload);
      const res = await client.get(url);
      if (!res.ok) continue;
      if (CMD_MARKERS.test(res.body)) {
        cmdHits++;
        R(SEVERITY.CRITICAL, 'A03-03', 'OS Command Injection', 'Dau hieu thuc thi lenh he thong qua ' + r.url + ' voi payload ' + payload + '.',
          { url, evidence: String(res.body).slice(0, 300), remediation: 'Khong dua dau vao nguoi dung vao shell; dung API he thong hoac allowlist tham so.' });
        break;
      }
    }
    if (cmdHits) break;
  }
  if (!cmdHits) report.pass();

  // A03-04: NoSQL injection tren endpoint dang nhap
  for (const p of P.NOSQL) {
    const r = await anon.post(baseUrl + '/api/auth/login', { body: { username: p, password: p } });
    if (!r.ok) continue;
    if (r.status >= 200 && r.status < 300) {
      nosqlHits++;
      R(SEVERITY.CRITICAL, 'A03-04', 'NoSQL Injection tai dang nhap', 'Body ' + JSON.stringify(p) + ' vuot qua xac thuc (HTTP ' + r.status + ').',
        { url: baseUrl + '/api/auth/login', evidence: String(r.body).slice(0, 200), remediation: 'Ep kieu dau vao la string; dung class-validator @IsString.' });
      break;
    }
    if (NOSQL_ERRORS.test(r.body)) {
      R(SEVERITY.HIGH, 'A03-04', 'NoSQL Injection (loi lo ra)', 'Loi CSDL khi gui toan tu NoSQL: ' + r.body.slice(0, 150), { url: baseUrl + '/api/auth/login', remediation: 'Ep kieu va kiem tra dau vao.' });
      break;
    }
  }
  if (!nosqlHits) report.pass();

  // A03-05: Prototype pollution qua JSON body
  if (authed) {
    const r = await authed.post(baseUrl + '/api/auth/login', { body: JSON.parse('{"username":"a","password":"b","__proto__":{"polluted":true}}') });
    const chk = await anon.get(baseUrl + '/api/health');
    if (chk.body && chk.body.includes('polluted')) R(SEVERITY.HIGH, 'A03-05', 'Prototype pollution', 'Thuoc tinh __proto__ anh huong doi tuong toan cuc.', { remediation: 'Dung Object.create(null) / loc bo __proto__, constructor, prototype.' });
    else report.pass();
  }

  // A03-06: SSTI
  // SSTI: chi ket luan khi ket qua tinh toan xuat hien o phan hoi THANH CONG,
  // va dau vao binh thuong khong sinh ra chuoi do (tranh trung ngau nhien voi '49').
  let ssti = false;
  for (const r of targets.slice(0, 25)) {
    const probeKey = 'q';
    const ctrlUrl = baseUrl + r.sampleUrl + (r.sampleUrl.includes('?') ? '&' : '?') + probeKey + '=ssti_control_7x7';
    const ctrl = await client.get(ctrlUrl);
    if (!ctrl.ok || ctrl.status < 200 || ctrl.status >= 300) continue;
    const ctrlHas49 = ctrl.body.includes('49');
    for (const p of P.SSTI.slice(0, 3)) {
      const url = baseUrl + r.sampleUrl + (r.sampleUrl.includes('?') ? '&' : '?') + probeKey + '=' + encodeURIComponent(p);
      const res = await client.get(url);
      if (!res.ok || res.status < 200 || res.status >= 300) continue;
      // Phai: (a) phan hoi thanh cong, (b) chua '49', (c) baseline khong chua '49',
      // (d) payload goc khong con nguyen ven trong phan hoi
      if (res.body.includes('49') && !ctrlHas49 && !res.body.includes(p)) {
        ssti = true;
        R(SEVERITY.HIGH, 'A03-06', 'Server-Side Template Injection', 'Payload ' + p + ' duoc danh gia thanh 49 tai ' + r.url + ' (dau vao doi chung khong sinh ra 49).', { url, evidence: String(res.body).slice(0, 200), remediation: 'Khong render template tu dau vao nguoi dung.' });
        break;
      }
    }
    if (ssti) break;
  }
  if (!ssti) report.pass();
}

module.exports = Object.assign({}, MODULE, { run });