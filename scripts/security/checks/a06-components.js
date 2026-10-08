'use strict';
// A06:2021 - Vulnerable and Outdated Components
// Quet phu thuoc bang npm audit (chay tinh, khong cai dat gi)
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { SEVERITY } = require('../lib/config');

const MODULE = { id: 'A06', name: 'Vulnerable and Outdated Components (Thanh phan lo hong/loi thoi)' };

const MAP = { critical: SEVERITY.CRITICAL, high: SEVERITY.HIGH, moderate: SEVERITY.MEDIUM, low: SEVERITY.LOW, info: SEVERITY.INFO };

// Chay npm an toan tren moi nen tang.
// - POSIX: 'npm' la script co shebang -> chay truc tiep duoc.
// - Windows: npm la npm.cmd; tu Node 20 khong the spawn .cmd truc tiep (EINVAL).
//   Dung cmd.exe voi CHUOI LENH CO DINH (khong noi suy du lieu nguoi dung) -> khong co rui ro chen lenh.
function runNpm(args, cwd, timeoutMs) {
  const opts = { cwd, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] };
  if (process.platform === 'win32') {
    const cmd = 'npm ' + args.map((a) => (/[\s"]/.test(a) ? '"' + a.replace(/"/g, '\\"') + '"' : a)).join(' ');
    return execFileSync('cmd.exe', ['/d', '/s', '/c', cmd], opts);
  }
  return execFileSync('npm', args, opts);
}

function audit(dir) {
  if (!fs.existsSync(path.join(dir, 'package.json'))) return null;
  try {
    const out = runNpm(['audit', '--json', '--package-lock-only'], dir, 180000);
    return JSON.parse(out);
  } catch (e) {
    // npm audit tra exit code != 0 khi co lo hong -> van co JSON tren stdout
    const txt = (e && (e.stdout || '')) + '';
    if (txt.trim().startsWith('{')) { try { return JSON.parse(txt); } catch { return null; } }
    return { __error: (e && e.message) || String(e) };
  }
}

async function run(ctx) {
  const { report, args } = ctx;
  const R = (sev, id, title, detail, extra) => report.fail(sev, id, title, detail, extra);
  const root = process.cwd();
  const dirs = [path.join(root, 'backend'), path.join(root, 'frontend'), root];

  let total = 0;
  for (const d of dirs) {
    const label = path.relative(root, d) || '.';
    const res = audit(d);
    if (!res) { report.pass(); continue; }
    if (res.__error) {
      report.error('A06-01', label + ': khong chay duoc npm audit - ' + res.__error.slice(0, 120));
      // Kiem tra chuoi cung ung KHONG thuc hien duoc -> phai hien thi trong bao cao,
      // khong duoc phep im lang bao 'dat'.
      R(SEVERITY.MEDIUM, 'A06-00', 'Chua kiem tra duoc lo hong chuoi cung ung (' + label + ')',
        'Khong chay duoc npm audit nen cac goi phu thuoc CHUA duoc doi chieu CVE. Can chay lai trong moi truong co npm.',
        { remediation: 'Chay npm audit trong moi truong co ket noi mang / co npm; xem xet bat kiem tra trong CI.' });
      continue;
    }
    const v = res.vulnerabilities || {};
    const meta = res.metadata && res.metadata.vulnerabilities;
    if (meta) {
      for (const [sev, count] of Object.entries(meta)) {
        if (!count) continue;
        total += count;
        R(MAP[sev] || SEVERITY.LOW, 'A06-01', 'Phu thuoc co lo hong da biet (' + label + ')', count + ' goi o muc ' + sev + '.',
          { remediation: 'Chay npm audit fix / nang cap goi trong ' + label + '. Xem chi tiet trong security-report.json.' });
      }
    }
    // Chi tiet cac goi muc high/critical
    const worst = Object.values(v).filter((x) => x && (x.severity === 'critical' || x.severity === 'high')).slice(0, 12);
    for (const w of worst) {
      R(MAP[w.severity] || SEVERITY.HIGH, 'A06-02', 'Goi lo hong: ' + w.name + ' (' + label + ')',
        (w.via || []).map((x) => (typeof x === 'string' ? x : x.title + ' [' + (x.url || '') + ']')).join(' | ').slice(0, 400) || 'Khong co mo ta',
        { remediation: 'Nang cap ' + w.name + ' len ban da sua (' + (w.fixAvailable && w.fixAvailable.version ? w.fixAvailable.version : 'xem npm audit') + ').' });
    }
    if (!Object.keys(v).length) report.pass();
  }

  // A06-03: Kiem tra goi loi thoi (outdated) — thong tin, khong tinh la lo hong
  for (const d of [path.join(root, 'backend'), path.join(root, 'frontend')]) {
    const label = path.relative(root, d) || '.';
    try {
      const out = runNpm(['outdated', '--json'], d, 120000);
      const o = JSON.parse(out || '{}');
      const n = Object.keys(o).length;
      if (n > 0) R(SEVERITY.INFO, 'A06-03', 'Co ' + n + ' goi loi thoi (' + label + ')', 'Nen lap ke hoach nang cap dinh ky.', { remediation: 'Duy tri quy trinh cap nhat phu thuoc hang thang.' });
      else report.pass();
    } catch (e) {
      const txt = (e && e.stdout) || '';
      if (txt.trim().startsWith('{')) { try { const o = JSON.parse(txt); const n = Object.keys(o).length; if (n) R(SEVERITY.INFO, 'A06-03', 'Co ' + n + ' goi loi thoi (' + label + ')', 'Nen lap ke hoach nang cap dinh ky.', {}); else report.pass(); } catch { report.pass(); } }
      else report.pass();
    }
  }
}

module.exports = Object.assign({}, MODULE, { run });