'use strict';
// A09:2021 - Security Logging and Monitoring Failures
const crypto = require('crypto');
const { SEVERITY } = require('../lib/config');

const MODULE = { id: 'A09', name: 'Security Logging and Monitoring Failures (Ghi log & giam sat)' };

async function run(ctx) {
  const { anon, baseUrl, report, routes } = ctx;
  const R = (sev, id, title, detail, extra) => report.fail(sev, id, title, detail, extra);

  // A09-01: Lo file log qua web
  // LUU Y: ung dung SPA tra ve index.html cho moi duong dan -> phai loai tru,
  // va phai xac nhan noi dung THUC SU la dinh dang dong log.
  const homeRes = await anon.get(baseUrl + '/');
  const homeBody = homeRes.ok ? String(homeRes.body) : '';
  const homeHash = crypto.createHash('sha256').update(homeBody).digest('hex');
  // Dong log that: co moc thoi gian + muc do log, hoac dong JSON log
  const LOG_LINE = /(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})|\b(INFO|WARN|ERROR|DEBUG|FATAL)\b|^\s*\{\s*"(level|time|msg|message)"/m;
  const logs = ['/api3001.log', '/api.log', '/logs', '/logs/app.log', '/error.log', '/backend/api3001.log', '/app.log', '/npm-debug.log'];
  let logOpen = null;
  let spaSkipped = 0;
  for (const l of logs) {
    const r = await anon.get(baseUrl + l);
    if (!r.ok || r.status !== 200 || !r.body || r.body.length <= 100) continue;
    const s = String(r.body);
    const isShell = crypto.createHash('sha256').update(s).digest('hex') === homeHash
      || (/<!doctype html|<html/i.test(s) && /<script[^>]+src=/i.test(s));
    if (isShell) { spaSkipped++; continue; }
    if (!LOG_LINE.test(s)) continue;
    logOpen = { l, r }; break;
  }
  if (logOpen) R(SEVERITY.HIGH, 'A09-01', 'File log truy cap duoc qua web', 'GET ' + logOpen.l + ' tra HTTP 200 va noi dung dung dinh dang dong log (' + logOpen.r.body.length + ' byte).', { url: baseUrl + logOpen.l, evidence: String(logOpen.r.body).slice(0, 200), remediation: 'Chan truy cap file log tai web server; luu log ngoai thu muc phuc vu.' });
  else {
    if (spaSkipped > 0) {
      R(SEVERITY.INFO, 'A09-01b', 'Da loai tru ' + spaSkipped + ' duong dan do trang vo SPA',
        'Cac duong dan nhu /api3001.log tra HTTP 200 nhung noi dung la index.html cua ung dung SPA, khong phai file log bi lo.',
        { remediation: 'Khong can xu ly.' });
    }
    report.pass();
  }

  // A09-02: Log injection (CRLF) - khong the doc log tu xa, ghi nhan de kiem tra thu cong
  const crlfUser = 'user' + String.fromCharCode(13) + String.fromCharCode(10) + '[SECURITY] FAKE ADMIN LOGIN SUCCESS';
  const r2 = await anon.post(baseUrl + '/api/auth/login', { body: { username: crlfUser, password: 'x' } });
  if (r2.ok && r2.status >= 500) {
    R(SEVERITY.LOW, 'A09-02', 'Dau vao chua CRLF gay loi xu ly', 'Ten dang nhap chua CRLF lam loi may chu (HTTP ' + r2.status + ').', { url: baseUrl + '/api/auth/login', remediation: 'Lam sach ky tu dieu khien trong du lieu ghi log.' });
  } else report.pass();

  // A09-03: Endpoint nhat ky kiem toan ton tai va duoc bao ve
  const auditRoutes = routes.filter((r) => /(audit|log|history|activity|trace|journal)/i.test(r.url) && r.method === 'GET');
  if (!auditRoutes.length) {
    R(SEVERITY.MEDIUM, 'A09-03', 'Khong tim thay endpoint nhat ky kiem toan', 'Khong co route GET nao lien quan audit/log/history - kho truy vet su co.', { remediation: 'Bo sung nhat ky kiem toan cho hanh dong quan trong va endpoint tra cuu cho quan tri.' });
  } else {
    let exposed = 0;
    for (const r of auditRoutes.slice(0, 15)) {
      const res = await anon.get(baseUrl + r.sampleUrl);
      if (res.ok && res.status >= 200 && res.status < 300) { exposed++; R(SEVERITY.HIGH, 'A09-03', 'Nhat ky kiem toan truy cap duoc khi an danh', 'GET ' + r.url + ' tra HTTP ' + res.status + ' khong can token.', { url: r.url, evidence: String(res.body).slice(0, 200), remediation: 'Bao ve endpoint nhat ky bang xac thuc + vai tro quan tri.' }); }
    }
    if (!exposed) report.pass();
  }

  // A09-04: Header truy vet / tuong quan
  const hres = await anon.get(baseUrl + '/api/health');
  const traceHdr = hres.headers['x-request-id'] || hres.headers['x-correlation-id'] || hres.headers['traceparent'];
  if (!traceHdr) R(SEVERITY.LOW, 'A09-04', 'Thieu ma tuong quan (correlation id) trong phan hoi', 'Khong co X-Request-Id / X-Correlation-Id / traceparent - kho doi chieu log voi su co.', { url: baseUrl + '/api/health', remediation: 'Them middleware sinh/giu X-Request-Id va tra ve trong phan hoi.' });
  else report.pass();

  // A09-05: Loi 500 tra ve chi tiet noi bo
  const r500 = await anon.get(baseUrl + '/api/working-papers/999999999999999999999999');
  if (r500.ok && r500.status === 500 && /stack|Error:|\bat /.test(r500.body)) {
    R(SEVERITY.MEDIUM, 'A09-05', 'Loi 500 tra ve chi tiet noi bo', 'GET /api/working-papers/<id lon> gay loi 500 kem chi tiet.', { url: baseUrl + '/api/working-papers/999999999999999999999999', evidence: String(r500.body).slice(0, 250), remediation: 'Bat exception filter toan cuc; ghi chi tiet vao log, tra ve thong bao chung.' });
  } else report.pass();
}

module.exports = Object.assign({}, MODULE, { run });