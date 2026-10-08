'use strict';
// TU KIEM CHUNG: chay bo test bao mat tren ung dung GIA CO Y LO HONG
// Muc dich: chung minh cac phep kiem thuc su PHAT HIEN duoc loi (khong phai luon 'dat').
const { spawn, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const PORT = 3987;
const ROOT = path.resolve(__dirname, '..', '..', '..');
const FIXTURE = path.join(__dirname, 'fixtures', 'vulnerable-app.js');
const ROUTES = path.join(__dirname, 'fixtures', 'vulnerable-routes.json');
const OUT = path.join(ROOT, 'security-reports', 'selftest-detection');

// Cac ma phat hien BAT BUOC phai xuat hien khi quet ung dung lo hong
const EXPECTED = [
  ['A01-01', 'Truy cap route nghiep vu khi chua xac thuc'],
  ['A02-04', 'JWT alg=none duoc chap nhan'],
  ['A02-06', 'Lo thong tin nhay cam (jwt_secret)'],
  ['A03-01', 'SQL Injection (lo loi CSDL)'],
  ['A03-02', 'Reflected XSS'],
  ['A03-04', 'NoSQL Injection'],
  ['A04-03', 'Khong gioi han tan suat dang nhap'],
  ['A05-01', 'Lo banner X-Powered-By'],
  ['A05-04', 'Thieu Content-Security-Policy'],
  ['A07-01', 'Chap nhan token khong hop le'],
  ['A07-05', 'Tai khoan mat khau mac dinh'],
  ['A08-01', 'Tai tep nguy hiem khong bi chan'],
  ['A09-03', 'Nhat ky kiem toan lo cong khai'],
  ['A09-05', 'Loi 500 lo chi tiet'],
  ['A10-01', 'SSRF'],
];

// Cac ma KHONG duoc xuat hien (tranh duong tinh gia nghiem trong)
const FORBIDDEN = ['A06-01'];

function waitReady(proc) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Het thoi gian cho ung dung gia khoi dong')), 15000);
    proc.stdout.on('data', (d) => { if (String(d).includes('READY')) { clearTimeout(t); resolve(); } });
    proc.on('exit', (c) => { clearTimeout(t); reject(new Error('Ung dung gia thoat som, ma ' + c)); });
  });
}

async function main() {
  console.log('\n=== TU KIEM CHUNG KHA NANG PHAT HIEN ===');
  const app = spawn(process.execPath, [FIXTURE, String(PORT)], { stdio: ['ignore', 'pipe', 'pipe'] });
  app.stderr.on('data', (d) => process.stderr.write('[app] ' + d));

  try {
    await waitReady(app);
    console.log('Ung dung gia da chay tai cong ' + PORT);

    let exitCode = 0;
    try {
      execFileSync(process.execPath, [
        path.join(ROOT, 'scripts', 'security', 'run-security-suite.js'),
        '--url', 'http://127.0.0.1:' + PORT,
        '--routes', ROUTES,
        '--out', OUT,
        '--only', 'A01,A02,A03,A04,A05,A07,A08,A09,A10',
        // Ung dung GIA trong fixtures co chu dich chua lo hong, khong phai he thong that.
        // Can --unsafe de cac phep kiem thay doi du lieu (A07-05 do mat khau) duoc chay,
        // qua do xac nhan bo test phat hien duoc ca nhung lo hong nay.
        '--unsafe',
      ], { cwd: ROOT, stdio: 'inherit', env: Object.assign({}, process.env, { KTNB_ADMIN_USER: 'admin', KTNB_ADMIN_PASS: 'admin123', NO_COLOR: '1' }) });
    } catch (e) { exitCode = e.status; }

    const rep = JSON.parse(fs.readFileSync(path.join(OUT, 'security-report.json'), 'utf8'));
    const ids = new Set(rep.findings.map((f) => f.id));

    console.log('\n=== KET QUA TU KIEM CHUNG ===');
    console.log('Ma thoat bo test: ' + exitCode + ' (mong doi 1 = that bai, dung vi app co lo hong)');
    let missing = 0;
    for (const [id, desc] of EXPECTED) {
      const ok = ids.has(id);
      if (!ok) missing++;
      console.log('  ' + (ok ? '[PHAT HIEN]' : '[BO SOT  ]') + ' ' + id.padEnd(8) + desc);
    }
    let fp = 0;
    for (const id of FORBIDDEN) { if (ids.has(id)) { fp++; console.log('  [DUONG TINH GIA] ' + id); } }

    const detected = EXPECTED.length - missing;
    console.log('\n  Ti le phat hien: ' + detected + '/' + EXPECTED.length);
    console.log('  Duong tinh gia   : ' + fp);

    if (missing === 0 && fp === 0 && exitCode === 1) {
      console.log('\n  KET LUAN: Bo test HOAT DONG DUNG - phat hien day du lo hong da cam.');
      return 0;
    }
    console.log('\n  KET LUAN: Bo test CHUA DAT - xem chi tiet ben tren.');
    return 1;
  } finally {
    app.kill();
  }
}

main().then((c) => { process.exitCode = c; }).catch((e) => { console.error(e); process.exitCode = 2; });