'use strict';
// Ung dung GIA CO Y LO HONG - chi dung de TU KIEM CHUNG bo test bao mat
// KHONG duoc trien khai. Muc dich: xac nhan cac phep kiem thuc su PHAT HIEN duoc loi.
const http = require('http');

const PORT = parseInt(process.argv[2] || '3999', 10);
const JWT_NONE = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxIiwidXNlcklkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwicm9sZXMiOlsiYWRtaW4iXSwiZXhwIjo5OTk5OTk5OTk5fQ.';

function json(res, code, obj, extraHeaders) {
  res.writeHead(code, Object.assign({ 'Content-Type': 'application/json', 'X-Powered-By': 'Express' }, extraHeaders || {}));
  res.end(typeof obj === 'string' ? obj : JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => { b += c; });
    req.on('end', () => resolve(b));
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;
  const auth = req.headers.authorization || '';
  const body = await readBody(req);

  // --- A05: thieu moi header bao mat, lo X-Powered-By ---
  if (p === '/api/health') return json(res, 200, { status: 'ok', db: 'postgres', jwt_secret: 'super-secret-value' });

  // --- A01: route nghiep vu KHONG can xac thuc ---
  if (p.startsWith('/api/users/')) return json(res, 200, { id: 1, username: 'admin', password: 'plaintext123' });
  if (p === '/api/audit-logs') return json(res, 200, [{ action: 'LOGIN', user: 'admin' }]);

  // --- A02/A07: chap nhan JWT alg=none va token rac ---
  if (p === '/api/auth/me') {
    const tok = auth.replace(/^Bearer\s+/i, '');
    let alg = null;
    try { alg = JSON.parse(Buffer.from(tok.split('.')[0], 'base64').toString('utf8')).alg; } catch { /* token khong hop le */ }
    // LO HONG: chap nhan alg=none va token rac
    if (alg === 'none' || alg === 'None' || auth === 'Bearer abc' || auth === 'Bearer null') {
      return json(res, 200, { id: 1, username: 'admin', role: 'admin' });
    }
    return json(res, 401, { message: 'Unauthorized' });
  }

  // --- A03/A04/A07: dang nhap - NoSQLi, mat khau mac dinh, khong gioi han tan suat ---
  if (p === '/api/auth/login' && req.method === 'POST') {
    let b = {};
    try { b = JSON.parse(body); } catch {}
    // NoSQL injection: username la object
    if (b.username && typeof b.username === 'object') return json(res, 200, { access_token: 'nosql-bypass-token', user: { role: 'admin' } });
    if (b.username === 'admin' && b.password === 'admin123') return json(res, 200, { access_token: 'real-admin-token', user: { role: 'admin' } });
    if (b.username === 'admin') return json(res, 401, { message: 'Sai mat khau cua tai khoan admin' });
    return json(res, 404, { message: 'Khong tim thay nguoi dung' });
  }

  // --- A03: SQL Injection lo loi CSDL ---
  if (p === '/api/search') {
    const q = u.searchParams.get('q') || '';
    if (q.includes("'") || /OR\s+1=1/i.test(q)) {
      return json(res, 500, 'SequelizeDatabaseError: SQL syntax error at or near "OR" at Query.run (/app/src/search.service.ts:42:11)');
    }
    return json(res, 200, { results: [] });
  }

  // --- A03: reflected XSS ---
  if (p === '/api/render') {
    const q = u.searchParams.get('q') || '';
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end('<html><body>Ket qua: ' + q + '</body></html>');
  }

  // --- A08: tai tep khong kiem tra ---
  if (p === '/api/upload' && req.method === 'POST') {
    const m = /filename="([^"]+)"/.exec(body);
    return json(res, 201, { uploaded: true, filename: m ? m[1] : 'unknown', path: '/uploads/' + (m ? m[1] : '') });
  }

  // --- A10: SSRF ---
  if (p === '/api/proxy') {
    const target = u.searchParams.get('url') || '';
    if (/169\.254\.169\.254|metadata|127\.0\.0\.1|file:\/\/|localhost/.test(target)) {
    return json(res, 200, { fetched: target, content: 'root:x:0:0:root:/root:/bin/bash\nami-id: i-1234567890' });
    }
    return json(res, 200, { fetched: target, content: 'ok' });
  }

  // --- A09: loi 500 lo stack trace ---
  if (p.startsWith('/api/working-papers/')) {
    return json(res, 500, 'Error: invalid input syntax\n    at WorkingPapersService.findOne (/app/src/working-papers.service.ts:88:15)');
  }

  json(res, 404, { message: 'Not Found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('READY ' + PORT);
});

module.exports = server;