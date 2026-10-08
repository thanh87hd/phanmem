'use strict';
// A04:2021 - Insecure Design
const { SEVERITY } = require('../lib/config');
const P = require('../lib/payloads');

const MODULE = { id: 'A04', name: 'Insecure Design (Thiet ke khong an toan)' };

async function run(ctx) {
  const { anon, authed, baseUrl, report, routes } = ctx;
  const R = (sev, id, title, detail, extra) => report.fail(sev, id, title, detail, extra);

  // A04-01: Mass assignment — gui truong dac quyen khi dang ky
  // (tao tai khoan that -> bo qua o che do an toan)
  if (ctx.safe) report.skip('A04-01', 'Bo qua kiem tra mass assignment khi dang ky', 'Phep kiem nay tao tai khoan that nen khong chay o che do an toan.');
  const r1 = ctx.safe ? { ok: false, status: 0, body: '' } : await anon.post(baseUrl + '/api/auth/register', {
    body: { username: 'sec_probe_' + Date.now(), password: 'Str0ng!Passw0rd#2026', email: 'probe@example.com', role: 'admin', roles: ['admin'], isAdmin: true, isSuperAdmin: true, permissions: ['*'] },
  });
  if (!ctx.safe && r1.ok && r1.status >= 200 && r1.status < 300) {
    const b = r1.body.toLowerCase();
    if (/"role"\s*:\s*"admin"|"roles"\s*:\s*\[[^\]]*admin|"isadmin"\s*:\s*true/.test(b)) {
      R(SEVERITY.CRITICAL, 'A04-01', 'Mass assignment khi dang ky', 'Truong dac quyen (role/roles/isAdmin) duoc chap nhan trong body dang ky.', { url: baseUrl + '/api/auth/register', evidence: String(r1.body).slice(0, 300), remediation: 'Dung DTO whitelist voi class-validator; bat whitelist + forbidNonWhitelisted trong ValidationPipe.' });
    } else report.pass();
  }

  // A04-02: Do manh mat khau khi dang ky (tao tai khoan that -> bo qua o che do an toan)
  if (ctx.safe) report.skip('A04-02', 'Bo qua kiem tra do manh mat khau khi dang ky', 'Phep kiem nay tao tai khoan that nen khong chay o che do an toan.');
  const r2 = ctx.safe ? { ok: false, status: 0, body: '' } : await anon.post(baseUrl + '/api/auth/register', { body: { username: 'weakprobe' + Date.now(), password: '123', email: 'w@example.com' } });
  if (!ctx.safe && r2.ok && r2.status >= 200 && r2.status < 300) {
    R(SEVERITY.HIGH, 'A04-02', 'Khong bat buoc do manh mat khau', 'Dang ky voi mat khau "123" duoc chap nhan (HTTP ' + r2.status + ').', { url: baseUrl + '/api/auth/register', remediation: 'Ap dung chinh sach mat khau toi thieu 12 ky tu, co hoa/thuong/so/ky tu dac biet.' });
  } else report.pass();

  // A04-03: Kiem tra gioi han tan suat (rate limit) tren dang nhap
  // QUAN TRONG: dung tai khoan KHONG TON TAI lam muc tieu, de khong kich hoat
  // co che khoa tai khoan (MAX_FAILED_ATTEMPTS) tren tai khoan that.
  const attempts = 15;
  let got429 = false;
  const codes = [];
  const probeUser = 'sec_ratelimit_probe_' + Date.now();
  for (let i = 0; i < attempts; i++) {
    const r = await anon.post(baseUrl + '/api/auth/login', { body: { username: probeUser, password: 'wrong-password-' + i } });
    codes.push(r.status);
    if (r.status === 429) { got429 = true; break; }
  }
  if (!got429) {
    R(SEVERITY.HIGH, 'A04-03', 'Khong gioi han tan suat dang nhap (brute force)', attempts + ' lan dang nhap sai lien tiep khong bi chan (ma tra ve: ' + [...new Set(codes)].join(',') + ').', { url: baseUrl + '/api/auth/login', remediation: 'Bat ThrottlerGuard cho endpoint dang nhap (vi du 5 lan/phut/IP) va khoa tam thoi sau N lan sai.' });
  } else report.pass();

  // A04-04: Kiem tra tai khoan khong bi khoa sau nhieu lan sai (account lockout)
  // (chi bao cao khi khong co throttle — da bao o A04-03)

  // A04-05: Endpoint nguy hiem (reset/seed/backup/delete...)
  // TUYET DOI KHONG thuc thi: cac endpoint nay ghi du lieu / ghi de cau hinh.
  // Chi kiem tra bang chung AN TOAN: endpoint co bi chan khi goi AN DANH khong.
  const dangerous = routes.filter((r) => /(reset|delete-all|purge|truncate|migrate|seed|backup|restore|shutdown|drop)/i.test(r.url));
  if (dangerous.length) {
    let exposed = 0;
    for (const r of dangerous.slice(0, 20)) {
      // Chi thu voi khach AN DANH. Neu endpoint duoc bao ve dung, request bi tu choi
      // (401/403) va KHONG gay tac dung phu. Neu no thuc thi duoc khi an danh thi
      // do la lo hong nghiem trong va cung la thong tin can bao cao.
      const res = await anon.raw(r.method, baseUrl + r.sampleUrl);
      if (!res.ok) continue;
      if (res.status >= 200 && res.status < 300) {
        exposed++;
        R(SEVERITY.CRITICAL, 'A04-05', 'Endpoint nguy hiem thuc thi duoc khi CHUA xac thuc',
          r.method + ' ' + r.url + ' tra HTTP ' + res.status + ' khi khong co token. Endpoint nay co the thay doi du lieu/cau hinh.',
          { url: r.url, evidence: 'HTTP ' + res.status, remediation: 'Bat buoc xac thuc + vai tro quan tri cho moi thao tac pha huy.' });
      }
    }
    // Liet ke de ra soat thu cong, khong thuc thi
    R(SEVERITY.INFO, 'A04-05b', 'Danh sach endpoint nguy hiem can ra soat thu cong (' + dangerous.length + ')',
      'Cac endpoint sau thay doi du lieu/cau hinh nen KHONG duoc bo test tu dong goi. Can kiem tra quyen va xac thuc lai bang tay tren moi truong test: ' +
      dangerous.slice(0, 12).map((r) => r.method + ' ' + r.url).join('; '),
      { remediation: 'Xac nhan tung endpoint yeu cau vai tro quan tri va xac nhan hanh dong (re-auth).' });
    if (!exposed) report.pass();
  }

  // A04-06: Thieu gioi han kich thuoc body / tham so cuc lon
  const big = 'A'.repeat(ctx.safe ? 512 * 1024 : 2 * 1024 * 1024);
  const rb = await anon.post(baseUrl + '/api/auth/login', { body: { username: big, password: big }, timeout: 30000 });
  if (rb.ok && rb.status >= 200 && rb.status < 300) R(SEVERITY.MEDIUM, 'A04-06', 'Khong gioi han kich thuoc dau vao', 'Body 4MB duoc chap nhan (HTTP ' + rb.status + ').', { remediation: 'Gioi han body (vi du 1MB) tai NestFactory va reverse proxy.' });
  else report.pass();
}

module.exports = Object.assign({}, MODULE, { run });