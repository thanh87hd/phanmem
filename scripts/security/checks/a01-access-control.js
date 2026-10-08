'use strict';
// A01:2021 - Broken Access Control
const { SEVERITY } = require('../lib/config');
const { DEFAULT_CREDS } = require('../lib/context');

const MODULE = { id: 'A01', name: 'Broken Access Control (Kiem soat truy cap hong)' };

async function run(ctx) {
  const { anon, authed, baseUrl, report, routes } = ctx;
  const R = (sev, id, title, detail, extra) => report.fail(sev, id, title, detail, extra);

  // A01-01: Route nghiep vu truy cap duoc khi CHUA dang nhap
  const candidates = routes.filter((r) => !r.isPublic && !/^\/api\/health/.test(r.url)).slice(0, 120);
  const leaked = [];
  for (const r of candidates) {
    if (r.method !== 'GET') continue;
    const res = await anon.get(baseUrl + r.sampleUrl);
    if (!res.ok) { report.error('A01-01', r.url + ': ' + res.error); continue; }
    if (res.status >= 200 && res.status < 300) leaked.push({ route: r, res });
  }
  if (leaked.length) {
    for (const l of leaked.slice(0, 15)) {
      R(SEVERITY.CRITICAL, 'A01-01', 'Route nghiep vu cho phep truy cap khi chua xac thuc',
        'GET ' + l.route.url + ' tra ve HTTP ' + l.res.status + ' khi khong co token.',
        { url: l.route.url, evidence: String(l.res.body).slice(0, 200), remediation: 'Bat JwtAuthGuard toan cuc hoac them @UseGuards(JwtAuthGuard) cho controller ' + l.route.controller + '.' });
    }
    if (leaked.length > 15) R(SEVERITY.HIGH, 'A01-01b', 'Con ' + (leaked.length - 15) + ' route khac cung bi lo', 'Tong so route truy cap duoc khi an danh: ' + leaked.length, { remediation: 'Rà soát toàn bộ guard xác thực.' });
  } else report.pass();

  // A01-02: IDOR - truy cap tai nguyen voi ID khong ton tai / cua nguoi khac
  //
  // HAI DIEU KIEN BAT BUOC de ket luan IDOR (neu thieu se la duong tinh gia):
  //  (1) Phai kiem tra bang TAI KHOAN QUYEN THAP. Neu dung tai khoan quan tri thi
  //      viec doc duoc du lieu la DUNG THIET KE, khong phai lo hong.
  //  (2) Phan hoi phai CHUA DU LIEU THAT. Nhieu API tra HTTP 200 voi doi tuong RONG
  //      ({"total":0,"items":[]}) cho ID khong ton tai - do la hanh vi dung.
  if (ctx.authedUser) {
    const idorRoutes = routes.filter((r) => r.method === 'GET' && /:id/.test(r.url) && !r.isPublic).slice(0, 40);
    let n = 0;
    // Gia tri duoc coi la 'rong/khong co du lieu'
    const isEmptyish = (body) => {
      const s = String(body).trim();
      if (s.length <= 4) return true;
      if (/^(null|undefined|\[\]|\{\}|\{\s*\}|\[\s*\])$/.test(s)) return true;
      if (/not.?found|khong.?tim|khong ton tai|invalid|error|forbidden/i.test(s)) return true;
      // Doi tuong toan gia tri 0/rong: {"total":0,"items":[],...}
      if (/^\{/.test(s)) {
        try {
          const o = JSON.parse(s);
          const vals = Object.values(o);
          const allEmpty = vals.every((v) => v === 0 || v === null || v === '' ||
            (Array.isArray(v) && v.length === 0) ||
            (v && typeof v === 'object' && Object.keys(v).length === 0));
          if (allEmpty) return true;
        } catch (e) { /* khong phai JSON */ }
      }
      return false;
    };
    for (const r of idorRoutes) {
      const probeUrl = r.url.replace(/:id/, '999999999');
      const res = await ctx.authedUser.get(baseUrl + probeUrl);
      if (!res.ok) { report.error('A01-02', probeUrl + ': ' + res.error); continue; }
      // 403/401 voi quyen thap = dung thiet ke
      if (res.status === 403 || res.status === 401) continue;
      if (res.status !== 200) continue;
      if (isEmptyish(res.body)) continue;   // 200 nhung khong co du lieu -> khong phai IDOR
      n++;
      R(SEVERITY.HIGH, 'A01-02', 'Nghi van IDOR: tai khoan quyen thap doc duoc du lieu voi ID khong ton tai',
        'GET ' + probeUrl + ' voi tai khoan quyen thap (' + (ctx.auth.user ? ctx.auth.user.username : 'user') + ') tra HTTP 200 KEM DU LIEU THAT. Can kiem tra rang buoc so huu ban ghi.',
        { url: probeUrl, evidence: String(res.body).slice(0, 200), remediation: 'Kiem tra quyen so huu (owner/scope) trong service truoc khi tra du lieu.' });
      if (n > 8) break;
    }
    if (!n) report.pass();
  } else {
    R(SEVERITY.MEDIUM, 'A01-02', 'Chua kiem tra duoc IDOR (thieu tai khoan quyen thap)',
      'Can dat KTNB_USER_USER/KTNB_USER_PASS de kiem tra IDOR bang tai khoan quyen thap. Neu dung tai khoan quan tri thi ket qua se sai (quan tri doc duoc moi du lieu la dung thiet ke).',
      { remediation: 'Cung cap thong tin dang nhap tai khoan quyen thap qua bien moi truong.' });
  }

  // A01-03: HTTP method override / TRACE
  const trace = await anon.raw('TRACE', baseUrl + '/api/health');
  if (trace.ok && trace.status === 200) R(SEVERITY.MEDIUM, 'A01-03', 'Phuong thuc HTTP TRACE duoc bat', 'TRACE /api/health tra HTTP 200 (nguy co Cross-Site Tracing).', { remediation: 'Vo hieu hoa TRACE tai reverse proxy.' });
  else report.pass();

  // A01-04: CORS - phan hoi origin la voi credentials
  const evil = 'https://evil-attacker.example';
  const cors = await anon.get(baseUrl + '/api/health', { headers: { Origin: evil } });
  const acao = cors.headers['access-control-allow-origin'];
  const acac = cors.headers['access-control-allow-credentials'];
  if (acao === evil || acao === '*') {
    const sev = (acao === evil && acac === 'true') ? SEVERITY.CRITICAL : SEVERITY.MEDIUM;
    R(sev, 'A01-04', 'CORS phan hoi origin khong tin cay',
      'Origin: ' + evil + ' -> Access-Control-Allow-Origin: ' + acao + (acac ? ', Allow-Credentials: ' + acac : ''),
      { url: baseUrl + '/api/health', remediation: 'Chi cho phep origin trong danh sach trang (allowlist), khong dung * khi bat credentials.' });
  } else report.pass();

  // A01-05: Phan quyen theo vai tro - kiem tra route @Roles voi token quyen thap
  if (ctx.authedUser && ctx.auth.user && ctx.auth.user.ok) {
    const roleRoutes = routes.filter((r) => r.hasRoles);
    for (const r of roleRoutes) {
      const res = await ctx.authedUser.raw(r.method, baseUrl + r.sampleUrl);
      if (!res.ok) { report.error('A01-05', r.url + ': ' + res.error); continue; }
      if (res.status >= 200 && res.status < 300) {
        R(SEVERITY.HIGH, 'A01-05', 'Vuot qua phan quyen vai tro (@Roles)',
          r.method + ' ' + r.url + ' cho phep nguoi dung quyen thap (' + DEFAULT_CREDS.user.username + ') truy cap.',
          { url: r.url, evidence: 'HTTP ' + res.status, remediation: 'Kiem tra lai logic RolesGuard va gia tri @Roles cho ' + r.controller + '.' });
      }
    }
    report.pass();
  }
}

module.exports = Object.assign({}, MODULE, { run });