'use strict';
// A07:2021 - Identification and Authentication Failures
const { SEVERITY } = require('../lib/config');
const P = require('../lib/payloads');

const MODULE = { id: 'A07', name: 'Identification and Authentication Failures (Loi xac thuc)' };

async function run(ctx) {
  const { anon, baseUrl, report } = ctx;
  const R = (sev, id, title, detail, extra) => report.fail(sev, id, title, detail, extra);

  // A07-01: Token khong hop le bi tu choi
  const bad = ['', 'abc', 'Bearer', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.invalid', 'null', 'undefined'];
  for (const t of bad) {
    const h = t ? { Authorization: t.startsWith('Bearer') ? t : 'Bearer ' + t } : {};
    const r = await anon.get(baseUrl + '/api/auth/me', { headers: h });
    if (r.ok && r.status >= 200 && r.status < 300) {
      R(SEVERITY.CRITICAL, 'A07-01', 'Chap nhan token khong hop le', 'Authorization: ' + (t || '(khong co)') + ' -> HTTP ' + r.status + ' tai /api/auth/me.', { url: baseUrl + '/api/auth/me', evidence: String(r.body).slice(0, 200), remediation: 'Kiem tra chu ky va thoi han token chat che.' });
      break;
    }
  }
  report.pass();

  // A07-02: Token het han
  const { b64url } = P;
  const crypto = require('crypto');
  const expiredPayload = { sub: '1', userId: 1, username: 'admin', role: 'admin', iat: Math.floor(Date.now() / 1000) - 7200, exp: Math.floor(Date.now() / 1000) - 3600 };
  const weak = P.jwtWeakSecrets({ alg: 'HS256', typ: 'JWT' }, expiredPayload, crypto);
  let expiredAccepted = false;
  for (const cand of weak.slice(0, 5)) {
    const r = await anon.get(baseUrl + '/api/auth/me', { headers: { Authorization: 'Bearer ' + cand.token } });
    if (r.ok && r.status >= 200 && r.status < 300) { expiredAccepted = true; break; }
  }
  if (expiredAccepted) R(SEVERITY.CRITICAL, 'A07-02', 'Chap nhan JWT het han', 'Token co exp trong qua khu van duoc chap nhan.', { remediation: 'Bat kiem tra exp (mac dinh cua @nestjs/jwt) va khong tat ignoreExpiration.' });
  else report.pass();

  // A07-03: Enumeration tai khoan qua thong bao loi khac nhau
  const rExist = await anon.post(baseUrl + '/api/auth/login', { body: { username: 'admin', password: 'definitely-wrong-pw-' + Date.now() } });
  const rMiss = await anon.post(baseUrl + '/api/auth/login', { body: { username: 'khong-ton-tai-' + Date.now(), password: 'definitely-wrong-pw' } });
  const msgExist = String(rExist.body || '').toLowerCase();
  const msgMiss = String(rMiss.body || '').toLowerCase();
  if (rExist.status !== rMiss.status) {
    R(SEVERITY.MEDIUM, 'A07-03', 'Co the liet ke tai khoan qua ma trang thai', 'Tai khoan ton tai -> HTTP ' + rExist.status + ', khong ton tai -> HTTP ' + rMiss.status + '.', { url: baseUrl + '/api/auth/login', remediation: 'Tra cung mot thong bao va cung ma trang thai cho moi truong hop dang nhap that bai.' });
  } else if (msgExist && msgMiss && msgExist !== msgMiss && !/chính xác|incorrect|invalid/i.test(msgExist) === false) {
    // Chi bao khi thong bao khac nhau ro ret
    if (msgExist.replace(/admin|khong-ton-tai-\d+/g, '') !== msgMiss.replace(/admin|khong-ton-tai-\d+/g, '')) {
      R(SEVERITY.LOW, 'A07-03', 'Thong bao dang nhap that bai khac nhau', 'Co the dung de liet ke tai khoan.', { url: baseUrl + '/api/auth/login', remediation: 'Dung thong bao chung cho moi truong hop that bai.' });
    } else report.pass();
  } else report.pass();

  // A07-04: Khoi phuc mat khau khong yeu cau xac thuc / lo token
  const rFp = await anon.post(baseUrl + '/api/auth/forgot-password', { body: { username: 'admin' } });
  if (rFp.ok && rFp.status >= 200 && rFp.status < 300) {
    const b = String(rFp.body);
    if (/(token|password|matkhau|mật khẩu)\s*[":=]\s*["']?[A-Za-z0-9_\-]{6,}/i.test(b) && !/Vui lòng liên hệ/i.test(b)) {
      R(SEVERITY.HIGH, 'A07-04', 'Khoi phuc mat khau lo token/mat khau trong phan hoi', 'Phan hoi /api/auth/forgot-password chua du lieu nhay cam.', { url: baseUrl + '/api/auth/forgot-password', evidence: b.slice(0, 300), remediation: 'Khong tra token trong phan hoi; gui qua kenh ngoai bang (email) va luu dang bam.' });
    } else report.pass();
  } else report.pass();

  // A07-05: Mat khau mac dinh / yeu tren tai khoan thuong gap
  // CANH BAO: thu mat khau sai se lam TANG bo dem failedLoginAttempts va co the KHOA
  // tai khoan that. Vi vay chi chay khi nguoi dung chu dong cho phep (--unsafe),
  // va chi thu MOT mat khau cho MOI tai khoan de giam thieu rui ro.
  if (ctx.safe) {
    report.skip('A07-05', 'Bo qua kiem tra mat khau mac dinh',
      'Phep kiem nay thu dang nhap sai nhieu lan, co the KHOA tai khoan that (chinh sach khoa sau vai lan sai). Can chay thu cong tren moi truong test bang --unsafe.');
  } else {
    // Gioi han: toi da 2 tai khoan x 3 mat khau = 6 lan thu, duoi nguong khoa tai khoan
    // (he thong khoa sau 5 lan sai), de tranh khoa tai khoan that ngay ca khi dung --unsafe.
    const DEFAULTS = ['admin', 'admin123', '123456'];
    let defHit = null;
    outer: for (const u of P.COMMON_USERS.slice(0, 2)) {
      for (const pw of DEFAULTS) {
        const r = await anon.post(baseUrl + '/api/auth/login', { body: { username: u, password: pw } });
        if (r.status === 429) break outer;
        if (r.ok && r.status >= 200 && r.status < 300) { defHit = u + ' / ' + pw; break outer; }
      }
    }
    if (defHit) R(SEVERITY.CRITICAL, 'A07-05', 'Tai khoan dung mat khau mac dinh/yeu', 'Dang nhap thanh cong voi: ' + defHit, { url: baseUrl + '/api/auth/login', remediation: 'Bat doi mat khau lan dau; cam mat khau mac dinh; ap dung chinh sach mat khau manh.' });
    else report.pass();
  }

  // A07-06: Dang xuat phai vo hieu hoa token (neu co endpoint)
  if (ctx.safe) {
    report.skip('A07-06', 'Bo qua kiem tra vo hieu hoa token sau dang xuat', 'Phep kiem nay thay doi trang thai phien lam viec.');
  } else if (ctx.authed) {
    const r = await ctx.authed.post(baseUrl + '/api/auth/logout');
    if (r.ok && r.status >= 200 && r.status < 300) {
      const after = await ctx.authed.get(baseUrl + '/api/auth/me');
      if (after.ok && after.status >= 200 && after.status < 300) {
        R(SEVERITY.MEDIUM, 'A07-06', 'Token van hieu luc sau khi dang xuat', 'Sau POST /api/auth/logout, token cu van truy cap duoc /api/auth/me.', { remediation: 'Dung danh sach den (blacklist) token hoac thoi gian song ngan + refresh token.' });
      } else report.pass();
    }
  }
}

module.exports = Object.assign({}, MODULE, { run });