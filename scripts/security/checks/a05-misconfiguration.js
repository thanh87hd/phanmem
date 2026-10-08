'use strict';
// A05:2021 - Security Misconfiguration
const crypto = require('crypto');
const { SEVERITY } = require('../lib/config');

const MODULE = { id: 'A05', name: 'Security Misconfiguration (Cau hinh sai)' };

const REQUIRED_HEADERS = [
  { key: 'x-content-type-options', expect: 'nosniff', sev: 'medium', id: 'A05-02', title: 'Thieu X-Content-Type-Options: nosniff' },
  { key: 'x-frame-options', alt: 'content-security-policy', sev: 'medium', id: 'A05-03', title: 'Thieu chong nung frame (X-Frame-Options / CSP frame-ancestors)' },
  { key: 'content-security-policy', sev: 'medium', id: 'A05-04', title: 'Thieu Content-Security-Policy' },
  { key: 'referrer-policy', sev: 'low', id: 'A05-05', title: 'Thieu Referrer-Policy' },
  { key: 'permissions-policy', sev: 'low', id: 'A05-06', title: 'Thieu Permissions-Policy' },
];

const LEAK_PATTERNS = [
  // Stack trace co the lo ca duong dan .ts (ma nguon) lan .js (ban da build)
  { re: /at\s+[\w.$<>]+\s*\(?[^)\n]*\.(ts|js):\d+:\d+\)?/, id: 'A05-07', title: 'Lo vet stack trace (duong dan file nguon)', sev: 'medium' },
  // Lo duong dan tuyet doi cua may chu (vi du C:\\... hoac /home/...)
  { re: /[A-Za-z]:\\\\[^\s"']{6,}|\/(home|var|usr|opt|app)\/[\w./-]{6,}/, id: 'A05-07b', title: 'Lo duong dan tuyet doi cua may chu', sev: 'medium' },
  { re: /node_modules/, id: 'A05-07', title: 'Lo duong dan node_modules trong loi', sev: 'medium' },
  { re: /ECONNREFUSED|ETIMEDOUT|ENOTFOUND/, id: 'A05-08', title: 'Lo chi tiet loi ha tang (ECONNREFUSED/ETIMEDOUT)', sev: 'medium' },
  { re: /(password|secret|token)\s*[:=]\s*['"]?[A-Za-z0-9_\-]{8,}/i, id: 'A05-09', title: 'Lo thong tin bi mat trong phan hoi loi', sev: 'high' },
  { re: /PrismaClient|Sequelize|TypeORM|Mongoose/i, id: 'A05-10', title: 'Lo ten ORM/CSDL trong phan hoi loi', sev: 'low' },
];

async function run(ctx) {
  const { anon, baseUrl, report } = ctx;
  const R = (sev, id, title, detail, extra) => report.fail(sev, id, title, detail, extra);

  const res = await anon.get(baseUrl + '/api/health');
  if (!res.ok) { report.error('A05-01', 'Khong goi duoc /api/health: ' + res.error); return; }
  const h = res.headers;

  // A05-01: Banner cong nghe
  const banner = h['x-powered-by'];
  if (banner) R(SEVERITY.LOW, 'A05-01', 'Lo banner cong nghe qua X-Powered-By', 'Gia tri: ' + banner, { url: baseUrl + '/api/health', remediation: 'Tat header X-Powered-By (app.disable("x-powered-by") hoac helmet).' });
  else report.pass();
  const server = h['server'];
  if (server && /\d/.test(server)) R(SEVERITY.LOW, 'A05-01', 'Lo phien ban web server', 'Server: ' + server, { remediation: 'An phien ban trong header Server.' });
  else report.pass();

  // A05-02..06: Header bao mat thieu
  for (const req of REQUIRED_HEADERS) {
    const present = h[req.key] || (req.alt && h[req.alt]);
    if (!present) R(SEVERITY[req.sev.toUpperCase()] || req.sev, req.id, req.title, 'Khong tim thay header ' + req.key + (req.alt ? ' hoac ' + req.alt : '') + ' tren phan hoi.', { url: baseUrl + '/api/health', remediation: 'Bat helmet() voi cau hinh day du trong main.ts.' });
    else if (req.expect && !present.includes(req.expect)) R(SEVERITY[req.sev.toUpperCase()] || req.sev, req.id, req.title, 'Header ' + req.key + ' = "' + present + '" (mong doi chua "' + req.expect + '").', { url: baseUrl + '/api/health', remediation: 'Dat gia tri dung theo khuyen nghi.' });
    else report.pass();
  }

  // A05-07..10: Lo thong tin qua thong bao loi
  const errorProbes = [
    baseUrl + '/api/khong-ton-tai-' + Date.now(),
    baseUrl + '/api/auth/login',
    baseUrl + '/api/working-papers/999999999',
    baseUrl + '/api/users/abc-not-a-number',
    baseUrl + '/api/ai/monthly-report?q=abc',
    baseUrl + '/api/ai/monthly-report',
  ];
  for (const u of errorProbes) {
    let r;
    if (u.endsWith('/login')) r = await anon.post(u, { body: { username: 1, password: {} } });
    else r = await anon.get(u);
    if (!r.ok) continue;
    for (const p of LEAK_PATTERNS) {
      if (p.re.test(r.body)) {
        R(SEVERITY[p.sev.toUpperCase()] || p.sev, p.id, p.title, 'Tai ' + u + ' (HTTP ' + r.status + ').', { url: u, evidence: String(r.body).slice(0, 300), remediation: 'Dung exception filter toan cuc, tra ve thong bao chung cho nguoi dung va ghi chi tiet vao log noi bo.' });
        break;
      }
    }
  }
  report.pass();

  // A05-11: Swagger/API docs mo cong khai
  const docs = ['/api/docs', '/api-docs', '/swagger', '/api/swagger', '/docs', '/api/openapi.json', '/api/docs-json'];
  // Loai tru trang vo SPA: tra index.html cho moi duong dan, khong phai tai lieu API that
  const homeRes = await anon.get(baseUrl + '/');
  const homeHash = homeRes.ok ? crypto.createHash('sha256').update(String(homeRes.body)).digest('hex') : '';
  let docsOpen = false;
  let docsSpaSkipped = 0;
  for (const d of docs) {
    const r = await anon.get(baseUrl + d);
    if (!r.ok || r.status !== 200) continue;
    const s = String(r.body);
    const isShell = (homeHash && crypto.createHash('sha256').update(s).digest('hex') === homeHash)
      || (/<!doctype html|<html/i.test(s) && /<script[^>]+src=/i.test(s));
    if (isShell) { docsSpaSkipped++; continue; }
    // Tai lieu API that: co cau truc swagger/openapi, khong chi la HTML bat ky
    if (/"?(swagger|openapi)"?\s*[:=]|paths\s*:\s*\{|\"openapi\"\s*:/i.test(s)) {
      docsOpen = true;
      R(SEVERITY.MEDIUM, 'A05-11', 'Tai lieu API (Swagger) mo cong khai', 'GET ' + d + ' tra HTTP 200 va chua tai lieu API.', { url: baseUrl + d, evidence: String(r.body).slice(0, 200), remediation: 'Tat Swagger tren moi truong production hoac bao ve bang xac thuc.' });
      break;
    }
  }
  if (!docsOpen) {
    if (docsSpaSkipped > 0) {
      R(SEVERITY.INFO, 'A05-11b', 'Da loai tru ' + docsSpaSkipped + ' duong dan tai lieu API do trang vo SPA',
        'Cac duong dan nhu /api-docs tra HTTP 200 nhung noi dung la index.html cua ung dung SPA, khong phai Swagger/OpenAPI that.',
        { remediation: 'Khong can xu ly.' });
    }
    report.pass();
  }

  // A05-12: Phuong thuc HTTP khong duoc phep
  for (const m of ['PUT', 'DELETE', 'PATCH']) {
    const r = await anon.raw(m, baseUrl + '/api/health');
    if (r.ok && r.status >= 200 && r.status < 300) R(SEVERITY.LOW, 'A05-12', 'Phuong thuc HTTP khong mong doi duoc chap nhan', m + ' /api/health tra HTTP ' + r.status, { remediation: 'Chi cho phep phuong thuc can thiet tren tung route.' });
  }
  report.pass();
}

module.exports = Object.assign({}, MODULE, { run });