'use strict';
// Ung dung GIA DA CUNG CO - dung de kiem chung bo test KHONG bao dong gia
// Moi kiem soat bao mat deu duoc bat dung cach.
const http = require('http');
const crypto = require('crypto');

const PORT = parseInt(process.argv[2] || '3988', 10);
const SECRET = 'a-very-long-random-secret-value-not-guessable-32b';

const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
  'X-Request-Id': 'req-' + crypto.randomUUID(),
};

function json(res, code, obj) {
  res.writeHead(code, Object.assign({ 'Content-Type': 'application/json' }, SEC_HEADERS));
  res.end(typeof obj === 'string' ? obj : JSON.stringify(obj));
}

function b64d(s) { return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'); }

function verifyJwt(tok) {
  const parts = tok.split('.');
  if (parts.length !== 3) return null;
  let h, p;
  try { h = JSON.parse(b64d(parts[0])); p = JSON.parse(b64d(parts[1])); } catch { return null; }
  // AN TOAN: ghim thuat toan, tu choi none
  if (h.alg !== 'HS256') return null;
  const exp = crypto.createHmac('sha256', SECRET).update(parts[0] + '.' + parts[1]).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  if (exp !== parts[2]) return null;
  // AN TOAN: kiem tra het han
  if (!p.exp || p.exp < Math.floor(Date.now() / 1000)) return null;
  return p;
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let b = '', n = 0;
    req.on('data', (c) => { n += c.length; if (n > limit) { reject(new Error('TOO_LARGE')); req.destroy(); return; } b += c; });
    req.on('end', () => resolve(b));
    req.on('error', reject);
  });
}

const attempts = new Map();

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;
  const auth = req.headers.authorization || '';

  let body = '';
  try { body = await readBody(req, 1024 * 1024); }
  catch { return json(res, 413, { message: 'Payload too large' }); }

  // AN TOAN: chan dotfile
  if (/\/\.|\.env|\.git|package\.json|docker-compose/.test(p)) return json(res, 404, { message: 'Not Found' });

  // AN TOAN: chi cho phep phuong thuc can thiet
  if (!['GET', 'POST'].includes(req.method)) { res.writeHead(405, SEC_HEADERS); return res.end(); }

  // AN TOAN: health khong chua thong tin nhay cam
  if (p === '/api/health') return json(res, 200, { status: 'ok', version: '4.0.0' });

  // AN TOAN: dang nhap co gioi han tan suat
  if (p === '/api/auth/login' && req.method === 'POST') {
    const ip = req.socket.remoteAddress || 'unknown';
    const n = (attempts.get(ip) || 0) + 1;
    attempts.set(ip, n);
    if (n > 5) return json(res, 429, { message: 'Qua nhieu lan thu. Vui long thu lai sau.' });
    let b = {};
    try { b = JSON.parse(body); } catch {}
    // AN TOAN: ep kieu chuoi, chan NoSQL injection
    if (typeof b.username !== 'string' || typeof b.password !== 'string') return json(res, 400, { message: 'Du lieu khong hop le' });
    // AN TOAN: thong bao loi thong nhat, khong lo tai khoan co ton tai hay khong
    if (b.username === 'admin' && b.password === 'Str0ng!Passw0rd#2026') {
      const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64').replace(/=+$/, '');
      const pl = Buffer.from(JSON.stringify({ sub: '1', username: 'admin', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64').replace(/=+$/, '');
      const sig = crypto.createHmac('sha256', SECRET).update(h + '.' + pl).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      return json(res, 200, { access_token: h + '.' + pl + '.' + sig });
    }
    return json(res, 401, { message: 'Ten dang nhap hoac mat khau khong dung' });
  }

  // AN TOAN: dang ky chan mass assignment + bat mat khau manh
  if (p === '/api/auth/register' && req.method === 'POST') {
    let b = {};
    try { b = JSON.parse(body); } catch {}
    if (b.role || b.roles || b.isAdmin || b.permissions) return json(res, 400, { message: 'Truong khong duoc phep' });
    if (typeof b.password !== 'string' || b.password.length < 12 || !/[A-Z]/.test(b.password) || !/[0-9]/.test(b.password)) {
      return json(res, 400, { message: 'Mat khau phai tu 12 ky tu, co chu hoa va so' });
    }
    return json(res, 201, { id: 2, username: b.username });
  }

  // Cac route sau YEU CAU xac thuc
  const claims = verifyJwt(auth.replace(/^Bearer\s+/i, ''));
  if (!claims) return json(res, 401, { message: 'Unauthorized' });

  if (p === '/api/auth/me') return json(res, 200, { id: 1, username: 'admin', role: 'admin' });
  if (p === '/api/auth/logout' && req.method === 'POST') return json(res, 200, { message: 'Da dang xuat' });

  // AN TOAN: truy van tham so hoa - payload khong gay loi CSDL
  if (p === '/api/search') return json(res, 200, { results: [], query: String(u.searchParams.get('q') || '') });

  // AN TOAN: ma hoa dau ra, khong phan hoi HTML
  if (p === '/api/render') return json(res, 200, { rendered: String(u.searchParams.get('q') || '') });

  // AN TOAN: kiem tra loai tep, tu choi tep thuc thi
  if (p === '/api/upload' && req.method === 'POST') {
    const m = /filename="([^"]+)"/.exec(body);
    const name = m ? m[1] : '';
    if (!/\.(pdf|docx|xlsx|png|jpg)$/i.test(name) || /\.\.|\//.test(name)) return json(res, 400, { message: 'Dinh dang tep khong duoc phep' });
    return json(res, 201, { id: 'f1', filename: 'stored-' + crypto.randomUUID() + '.pdf' });
  }

  // AN TOAN: chan SSRF - allowlist ten mien
  if (p === '/api/proxy') {
    const target = u.searchParams.get('url') || '';
    if (!/^https:\/\/(api\.ktnb\.vn|data\.gov\.vn)\//.test(target)) return json(res, 400, { message: 'URL khong nam trong danh sach cho phep' });
    return json(res, 200, { fetched: target });
  }

  // AN TOAN: nhat ky kiem toan duoc bao ve + chi vai tro quan tri
  if (p === '/api/audit-logs') {
    if (claims.role !== 'admin') return json(res, 403, { message: 'Forbidden' });
    return json(res, 200, []);
  }

  if (p.startsWith('/api/users/')) return json(res, 200, { id: Number(u.pathname.split('/').pop()), username: 'admin' });

  // AN TOAN: loi tra ve thong bao chung, khong lo chi tiet
  return json(res, 404, { message: 'Not Found' });
});

server.listen(PORT, '127.0.0.1', () => console.log('READY ' + PORT));
module.exports = server;