'use strict';
// A08:2021 - Software and Data Integrity Failures
// Tap trung: tai tep khong kiem tra, XXE, giai ma khong an toan
const { SEVERITY } = require('../lib/config');
const P = require('../lib/payloads');

const MODULE = { id: 'A08', name: 'Software and Data Integrity Failures (Toan ven du lieu & phan mem)' };

// Tim route nhan tai tep (multipart)
function uploadRoutes(routes) {
  return routes.filter((r) => r.method === 'POST' && /(upload|import|attachment|file|document|excel|image|avatar)/i.test(r.url));
}

function multipart(file) {
  const b = '----ktnbsec' + Date.now();
  const parts = [
    '--' + b,
    'Content-Disposition: form-data; name="file"; filename="' + file.name + '"',
    'Content-Type: ' + file.type,
    '',
    file.body,
    '--' + b + '--',
    '',
  ];
  return { boundary: b, body: parts.join('\r\n') };
}

async function run(ctx) {
  const { anon, authed, baseUrl, report, routes } = ctx;
  const R = (sev, id, title, detail, extra) => report.fail(sev, id, title, detail, extra);
  const client = authed || anon;

  const up = uploadRoutes(routes);
  if (!up.length) { report.error('A08-01', 'Khong tim thay route tai tep nao trong ma nguon'); }

  // Tai tep ghi du lieu len may chu -> bo qua hoan toan o che do an toan
  if (ctx.safe) {
    report.skip('A08-01', 'Bo qua kiem tra tai tep nguy hiem', 'Phep kiem nay TAI TEP THAT len may chu. Can chay thu cong tren moi truong test.');
    report.skip('A08-02', 'Bo qua kiem tra path traversal khi tai tep', 'Phep kiem nay tai tep that len may chu.');
    report.skip('A08-03', 'Bo qua kiem tra XXE khi tai tep', 'Phep kiem nay tai tep that len may chu.');
    report.skip('A08-05', 'Bo qua kiem tra gioi han kich thuoc tep', 'Phep kiem nay tai tep that len may chu.');
  }

  // A08-01: Tai tep thuc thi duoc (php/jsp/aspx/phtml) khong bi chan
  const accepted = [];
  for (const r of (ctx.safe ? [] : up.slice(0, 10))) {
    for (const f of P.MALICIOUS_FILES.slice(0, 6)) {
      const mp = multipart(f);
      const res = await client.post(baseUrl + r.sampleUrl, {
        headers: { 'Content-Type': 'multipart/form-data; boundary=' + mp.boundary },
        body: mp.body,
      });
      if (!res.ok) continue;
      if (res.status >= 200 && res.status < 300) {
        accepted.push({ route: r, file: f, status: res.status, body: res.body });
      }
    }
    if (accepted.length > 6) break;
  }
  if (accepted.length) {
    for (const a of accepted.slice(0, 6)) {
      R(SEVERITY.CRITICAL, 'A08-01', 'Tai len tep nguy hiem khong bi chan: ' + a.file.name,
        'POST ' + a.route.url + ' chap nhan tep "' + a.file.name + '" (Content-Type ' + a.file.type + ') voi HTTP ' + a.status + '.',
        { url: a.route.url, evidence: String(a.body).slice(0, 250), remediation: 'Kiem tra ca phan mo rong va MIME thuc te (magic bytes); luu ngoai web root; doi ten tep; khong cho phep .php/.jsp/.aspx/.exe/.svg/.html.' });
    }
  } else report.pass();

  // A08-02: Path traversal qua ten tep
  let trav = null;
  for (const r of (ctx.safe ? [] : up.slice(0, 6))) {
    for (const t of P.TRAVERSAL.slice(0, 4)) {
      const mp = multipart({ name: t, type: 'image/png', body: 'PNGDATA' });
      const res = await client.post(baseUrl + r.sampleUrl, { headers: { 'Content-Type': 'multipart/form-data; boundary=' + mp.boundary }, body: mp.body });
      if (res.ok && res.status >= 200 && res.status < 300) { trav = { r, t, b: res.body }; break; }
    }
    if (trav) break;
  }
  if (trav) R(SEVERITY.HIGH, 'A08-02', 'Ten tep chua path traversal duoc chap nhan', 'POST ' + trav.r.url + ' voi ten tep "' + trav.t + '" tra HTTP thanh cong.', { url: trav.r.url, evidence: String(trav.b).slice(0, 250), remediation: 'Chuan hoa ten tep (basename), loai bo .. va ky tu duong dan.' });
  else report.pass();

  // A08-03: XXE qua tep XML
  let xxe = null;
  for (const r of (ctx.safe ? [] : up.slice(0, 8))) {
    const mp = multipart({ name: 'xxe.xml', type: 'text/xml', body: P.XXE_PAYLOAD });
    const res = await client.post(baseUrl + r.sampleUrl, { headers: { 'Content-Type': 'multipart/form-data; boundary=' + mp.boundary }, body: mp.body });
    if (!res.ok) continue;
    if (/root:x:0:0|\[extensions\]|for 16-bit app support/i.test(res.body)) { xxe = { r, b: res.body }; break; }
  }
  if (xxe) R(SEVERITY.CRITICAL, 'A08-03', 'XXE - thuc the ngoai duoc xu ly', 'POST ' + xxe.r.url + ' tra ve noi dung file he thong.', { url: xxe.r.url, evidence: String(xxe.b).slice(0, 300), remediation: 'Tat DTD/external entity trong trinh phan tich XML.' });
  else report.pass();

  // A08-04: Dau hieu giai ma doi tuong khong an toan
  const deser = await client.post(baseUrl + '/api/auth/login', { body: { username: 'rO0ABXNyABFqYXZhLnV0aWwuSGFzaE1hcA==', password: 'x' } });
  if (deser.ok && /ClassNotFound|ObjectInputStream|unserialize\(\)|java\.io/i.test(deser.body)) {
    R(SEVERITY.HIGH, 'A08-04', 'Dau hieu giai ma doi tuong khong an toan', 'Phan hoi chua loi giai ma Java/PHP.', { url: baseUrl + '/api/auth/login', evidence: String(deser.body).slice(0, 200), remediation: 'Khong giai ma doi tuong tu dau vao nguoi dung; dung JSON co luoc do.' });
  } else report.pass();

  // A08-05: Kich thuoc tep khong gioi han
  const huge = 'A'.repeat(12 * 1024 * 1024);
  let hugeOk = null;
  for (const r of (ctx.safe ? [] : up.slice(0, 5))) {
    const mp = multipart({ name: 'big.png', type: 'image/png', body: huge });
    const res = await client.post(baseUrl + r.sampleUrl, { headers: { 'Content-Type': 'multipart/form-data; boundary=' + mp.boundary }, body: mp.body, timeout: 60000 });
    if (res.ok && res.status >= 200 && res.status < 300) { hugeOk = { r, res }; break; }
  }
  if (hugeOk) R(SEVERITY.MEDIUM, 'A08-05', 'Khong gioi han kich thuoc tep tai len', 'POST ' + hugeOk.r.url + ' chap nhan tep 12MB.', { url: hugeOk.r.url, remediation: 'Gioi han kich thuoc tep va so luong tep moi request.' });
  else report.pass();

  // A08-06: Subresource Integrity (SRI) tren frontend
  const html = await anon.get(baseUrl + '/');
  if (html.ok && html.status === 200 && /<script[^>]+src=["']https?:/i.test(html.body) && !/integrity=/i.test(html.body)) {
    R(SEVERITY.MEDIUM, 'A08-06', 'Tai nguyen ngoai khong co SRI', 'Trang chu nap script tu mien ngoai nhung thieu thuoc tinh integrity.', { url: baseUrl + '/', remediation: 'Them integrity + crossorigin cho tai nguyen ngoai.' });
  } else report.pass();
}

module.exports = Object.assign({}, MODULE, { run });