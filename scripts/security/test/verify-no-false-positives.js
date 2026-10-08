'use strict';
// TU KIEM CHUNG DUONG TINH GIA: chay bo test tren ung dung DA CUNG CO
// Muc dich: chung minh bo test KHONG bao dong gia khi he thong da an toan.
const { spawn, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 3988;
const ROOT = path.resolve(__dirname, '..', '..', '..');
const FIXTURE = path.join(__dirname, 'fixtures', 'secure-app.js');
const ROUTES = path.join(__dirname, 'fixtures', 'secure-routes.json');
const OUT = path.join(ROOT, 'security-reports', 'selftest-false-positive');

function waitReady(proc) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Het thoi gian cho ung dung khoi dong')), 15000);
    proc.stdout.on('data', (d) => { if (String(d).includes('READY')) { clearTimeout(t); resolve(); } });
    proc.on('exit', (c) => { clearTimeout(t); reject(new Error('Ung dung thoat som, ma ' + c)); });
  });
}

async function main() {
  console.log('\n=== TU KIEM CHUNG DUONG TINH GIA (ung dung da cung co) ===');
  const app = spawn(process.execPath, [FIXTURE, String(PORT)], { stdio: ['ignore', 'pipe', 'pipe'] });
  app.stderr.on('data', (d) => process.stderr.write('[app] ' + d));

  try {
    await waitReady(app);
    console.log('Ung dung da cung co chay tai cong ' + PORT);

    let exitCode = 0;
    try {
      execFileSync(process.execPath, [
        path.join(ROOT, 'scripts', 'security', 'run-security-suite.js'),
        '--url', 'http://127.0.0.1:' + PORT,
        '--routes', ROUTES,
        '--out', OUT,
        '--only', 'A01,A02,A03,A04,A05,A07,A08,A09,A10',
      ], { cwd: ROOT, stdio: 'inherit', env: Object.assign({}, process.env, { NO_COLOR: '1' }) });
    } catch (e) { exitCode = e.status; }

    const rep = JSON.parse(fs.readFileSync(path.join(OUT, 'security-report.json'), 'utf8'));
    const severe = rep.findings.filter((f) => f.severity === 'critical' || f.severity === 'high');
    const medium = rep.findings.filter((f) => f.severity === 'medium');

    console.log('\n=== KET QUA TU KIEM CHUNG DUONG TINH GIA ===');
    console.log('Ma thoat bo test: ' + exitCode + ' (mong doi 0 = dat)');
    console.log('Phat hien muc critical/high: ' + severe.length + ' (mong doi 0)');
    for (const f of severe) console.log('   [' + f.severity + '] ' + f.id + ' - ' + f.title + ' @ ' + (f.url || ''));
    console.log('Phat hien muc medium (cho phep, la khuyen nghi cai thien): ' + medium.length);
    for (const f of medium) console.log('   [medium] ' + f.id + ' - ' + f.title);

    if (severe.length === 0 && exitCode === 0) {
      console.log('\n  KET LUAN: KHONG co duong tinh gia nghiem trong - bo test dang tin cay.');
      return 0;
    }
    console.log('\n  KET LUAN: Bo test BAO DONG GIA - can hieu chinh quy tac.');
    return 1;
  } finally {
    app.kill();
  }
}

main().then((c) => { process.exitCode = c; }).catch((e) => { console.error(e); process.exitCode = 2; });