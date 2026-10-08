'use strict';
// A02:2021 - Cryptographic Failures
const crypto = require('crypto');
const { SEVERITY } = require('../lib/config');
const P = require('../lib/payloads');

const MODULE = { id: 'A02', name: 'Cryptographic Failures (Loi mat ma)' };

async function run(ctx) {
  const { anon, baseUrl, report, routes, args } = ctx;
  const R = (sev, id, title, detail, extra) => report.fail(sev, id, title, detail, extra);

  // A02-01: Bat buoc HTTPS
  if (baseUrl.startsWith('http://') && !/localhost|127\.0\.0\.1/.test(baseUrl)) {
    R(SEVERITY.HIGH, 'A02-01', 'Dich su dung HTTP khong ma hoa', 'Base URL la ' + baseUrl + ' — du lieu xac thuc va nghiep vu truyen khong ma hoa.', { url: baseUrl, remediation: 'Bat buoc HTTPS va HSTS.' });
  } else report.pass();

  // A02-02: Header HSTS khi chay HTTPS
  if (baseUrl.startsWith('https://')) {
    const r = await anon.get(baseUrl + '/api/health');
    const hsts = r.headers['strict-transport-security'];
    if (!hsts) R(SEVERITY.MEDIUM, 'A02-02', 'Thieu header HSTS', 'Khong co Strict-Transport-Security tren phan hoi HTTPS.', { url: baseUrl + '/api/health', remediation: 'Them HSTS max-age>=31536000; includeSubDomains.' });
    else if (!/max-age=(\d+)/.test(hsts) || parseInt(RegExp.$1, 10) < 15552000) R(SEVERITY.LOW, 'A02-02', 'HSTS max-age qua ngan', 'Gia tri: ' + hsts, { remediation: 'Dat max-age toi thieu 15552000 (180 ngay).' });
    else report.pass();
  }

  // A02-03: Cookie phien thieu thuoc tinh bao mat
  const loginRes = await anon.post(baseUrl + '/api/auth/login', { body: { username: 'no-such-user-xyz', password: 'wrong' } });
  const sc = loginRes.headers['set-cookie'] || '';
  if (sc) {
    const low = sc.toLowerCase();
    if (!low.includes('httponly')) R(SEVERITY.HIGH, 'A02-03', 'Cookie phien thieu HttpOnly', 'Set-Cookie: ' + sc.slice(0, 160), { remediation: 'Them HttpOnly vao cookie JWT.' });
    else if (baseUrl.startsWith('https://') && !low.includes('secure')) R(SEVERITY.HIGH, 'A02-03', 'Cookie phien thieu Secure', 'Set-Cookie: ' + sc.slice(0, 160), { remediation: 'Them Secure.' });
    else if (!low.includes('samesite')) R(SEVERITY.MEDIUM, 'A02-03', 'Cookie phien thieu SameSite', 'Set-Cookie: ' + sc.slice(0, 160), { remediation: 'Them SameSite=Lax hoac Strict.' });
    else report.pass();
  }

  // A02-04: JWT chap nhan alg=none
  for (const tok of [P.jwtNoneAlg(), P.jwtAlgNoneUpper()]) {
    const r = await anon.get(baseUrl + '/api/auth/me', { headers: { Authorization: 'Bearer ' + tok } });
    if (r.status >= 200 && r.status < 300) {
      R(SEVERITY.CRITICAL, 'A02-04', 'JWT chap nhan alg=none (gia mao token)', 'Token voi alg=none duoc chap nhan (HTTP ' + r.status + ').', { url: baseUrl + '/api/auth/me', remediation: 'Ghim thuat toan (algorithms: ["HS256"]) trong JwtStrategy.' });
      break;
    }
  }
  report.pass();

  // A02-05: JWT ky bang khoa yeu doan duoc
  const payload = { sub: '1', userId: 1, username: 'admin', role: 'admin', roles: ['admin'], exp: Math.floor(Date.now() / 1000) + 3600 };
  let cracked = null;
  for (const cand of P.jwtWeakSecrets({ alg: 'HS256', typ: 'JWT' }, payload, crypto)) {
    const r = await anon.get(baseUrl + '/api/auth/me', { headers: { Authorization: 'Bearer ' + cand.token } });
    if (r.status >= 200 && r.status < 300) { cracked = cand.secret; break; }
  }
  if (cracked) R(SEVERITY.CRITICAL, 'A02-05', 'JWT_SECRET yeu, doan duoc', 'Ky token bang secret "' + cracked + '" duoc he thong chap nhan.', { remediation: 'Sinh JWT_SECRET ngau nhien >= 32 byte va luu trong secret manager.' });
  else report.pass();

  // A02-06: Thong tin nhay cam lo qua API cong khai
  const sensitive = [
    { path: '/api/health', keys: ['password', 'secret', 'jwt_secret', 'apikey', 'api_key', 'token', 'connectionString', 'DATABASE_URL'] },
    { path: '/api/auth/config', keys: ['secret', 'password', 'apiKey'] },
  ];
  for (const s of sensitive) {
    const r = await anon.get(baseUrl + s.path);
    if (!r.ok || r.status !== 200) continue;
    const body = r.body.toLowerCase();
    const hit = s.keys.filter((k) => body.includes(k.toLowerCase()));
    if (hit.length) R(SEVERITY.HIGH, 'A02-06', 'Lo thong tin nhay cam qua endpoint cong khai', s.path + ' chua: ' + hit.join(', '), { url: baseUrl + s.path, evidence: String(r.body).slice(0, 300), remediation: 'Loai bo truong nhay cam khoi DTO tra ve.' });
    else report.pass();
  }

  // A02-07: Duong dan lo file cau hinh / dotfile
  // QUAN TRONG: nhieu ung dung SPA (React/Vue) cau hinh web server tra ve index.html
  // cho MOI duong dan khong khop. Khi do /.env cung tra HTTP 200 nhung KHONG phai file bi lo.
  // Vi vay phai so sanh voi trang chu va kiem tra dinh dang noi dung THAT SU cua file.
  const homeRes = await anon.get(baseUrl + '/');
  const homeBody = homeRes.ok ? String(homeRes.body) : '';
  const homeHash = crypto.createHash('sha256').update(homeBody).digest('hex');
  const isSpaShell = (body) => {
    const s = String(body);
    // Trang vo SPA: HTML + tham chieu bundle JS, hoac trung khi voi trang chu
    return crypto.createHash('sha256').update(s).digest('hex') === homeHash
      || (/<!doctype html|<html/i.test(s) && /<script[^>]+src=/i.test(s));
  };

  const dots = [
    { path: '/.env', expect: /^[\w.]+\s*=/m, name: 'tep .env (bien moi truong)' },
    { path: '/.env.production', expect: /^[\w.]+\s*=/m, name: 'tep .env.production' },
    { path: '/.git/config', expect: /^\[core\]/m, name: 'cau hinh git' },
    { path: '/.git/HEAD', expect: /^ref:\s+refs\//m, name: 'git HEAD' },
    { path: '/package.json', expect: /"(name|version|dependencies)"\s*:/, name: 'package.json' },
    { path: '/backend/.env', expect: /^[\w.]+\s*=/m, name: 'tep .env backend' },
    { path: '/docker-compose.yml', expect: /^(services|version)\s*:/m, name: 'docker-compose.yml' },
    { path: '/.dockerignore', expect: /^[\w.*/]+$/m, name: '.dockerignore' },
    { path: '/.DS_Store', expect: /^\x00\x00\x00\x01Bud1/, name: '.DS_Store' },
    { path: '/config.json', expect: /^\s*[\[{]/, name: 'config.json' },
  ];
  let exposedFiles = 0;
  let spaFalsePositives = 0;
  for (const d of dots) {
    const r = await anon.get(baseUrl + d.path);
    if (!r.ok || r.status !== 200 || !r.body || r.body.length === 0) continue;
    // Loai tru trang vo SPA tra ve cho moi duong dan
    if (isSpaShell(r.body)) { spaFalsePositives++; continue; }
    // Chi ket luan khi noi dung THUC SU co dinh dang cua file cau hinh tuong ung
    if (!d.expect.test(String(r.body))) continue;
    exposedFiles++;
    R(SEVERITY.HIGH, 'A02-07', 'Lo file nhay cam qua web',
      'GET ' + d.path + ' tra HTTP 200 va noi dung dung dinh dang ' + d.name + ' (' + r.body.length + ' byte).',
      { url: baseUrl + d.path, evidence: String(r.body).slice(0, 200), remediation: 'Chan truy cap dotfile tai web server (nginx: location ~ /\\.  { deny all; }).' });
  }
  if (!exposedFiles) {
    if (spaFalsePositives > 0) {
      R(SEVERITY.INFO, 'A02-07b', 'Da loai tru ' + spaFalsePositives + ' duong dan do trang vo SPA',
        'Cac duong dan nhu /.env tra HTTP 200 nhung noi dung that ra la index.html cua ung dung SPA (trung voi trang chu), KHONG phai file bi lo. Day khong phai lo hong.',
        { remediation: 'Khong can xu ly. Bo kiem tra da tu dong nhan dien.' });
    }
    report.pass();
  }
}

module.exports = Object.assign({}, MODULE, { run });