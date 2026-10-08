#!/usr/bin/env node
'use strict';
// Bo test bao mat KTNB 4.0 - bo dieu phoi chinh
// Chay: node scripts/security/run-security-suite.js --help
const path = require('path');
const { SEVERITY_ORDER, DEFAULT_FAIL_ON, parseArgs, resolveTarget, defaultOutDir, helpText, isSafeMode } = require('./lib/config');
const { createReport, writeReports, sortFindings, SEV_ICON } = require('./lib/report');
const { buildContext } = require('./lib/context');
const { parseRoutes } = require('./lib/routes');
const checks = require('./checks');

const SUITE_VERSION = '1.0.0';

function color(s, c) {
  if (process.env.NO_COLOR) return s;
  const map = { red: 31, green: 32, yellow: 33, blue: 34, magenta: 35, cyan: 36, gray: 90, bold: 1 };
  return '\u001b[' + (map[c] || 0) + 'm' + s + '\u001b[0m';
}

function banner(t) { console.log('\n' + color('='.repeat(72), 'cyan') + '\n' + color('  ' + t, 'bold') + '\n' + color('='.repeat(72), 'cyan')); }

async function main() {
  const args = parseArgs(process.argv.slice(2));
  // Khi --json: giu stdout sach cho JSON, thong bao tien trinh ra stderr
  const log = args.json ? (...a) => console.error(...a) : (...a) => console.log(...a);
  if (args.help) { log(helpText()); return 0; }

  const baseUrl = resolveTarget(args);
  const outDir = args.out || defaultOutDir();
  const failOn = args.failOn || DEFAULT_FAIL_ON;

  banner('BO TEST BAO MAT KTNB 4.0');
  log('  Muc tieu      : ' + baseUrl);
  log('  Thu muc bao cao: ' + outDir);
  log('  Nguong fail   : ' + failOn.join(', '));
  const safeMode = isSafeMode(args);
  log('  Che do        : ' + (safeMode ? color('AN TOAN (khong thay doi du lieu)', 'green') : color('DAY DU (co the thay doi du lieu)', 'yellow')));

  const report = createReport({
    baseUrl, suiteVersion: SUITE_VERSION, startedAt: new Date().toISOString(),
    argv: process.argv.slice(2), node: process.version, platform: process.platform,
  });
  const t0 = Date.now();

  // 1. Doc danh sach route tu ma nguon
  let routes = [];
  if (args.routes) {
    try { routes = JSON.parse(require('fs').readFileSync(args.routes, 'utf8')); log('\n  Da nap ' + routes.length + ' route tu ' + args.routes); }
    catch (e) { log('\n  ' + color('LOI', 'red') + ': khong nap duoc ' + args.routes + ' (' + e.message + ')'); }
  } else {
    const srcDir = path.join(process.cwd(), 'backend', 'src');
    try { routes = parseRoutes(srcDir); log('\n  Da doc ' + routes.length + ' route tu ' + srcDir); }
    catch (e) { log('\n  ' + color('CANH BAO', 'yellow') + ': khong doc duoc ma nguon (' + e.message + ') - cac phep kiem can route se bi bo qua.'); }
  }

  // 2. Ngu canh + kiem tra dich song
  const ctx = await buildContext(args, baseUrl, report);
  ctx.routes = routes;
  ctx.safe = safeMode;
  const targetAlive = ctx.alive;
  if (targetAlive) {
    log('  Dich ' + color('SONG', 'green') + ' (HTTP ' + ctx.probe.status + ')');
    if (ctx.canAuth) log('  Da xac thuc quan tri: ' + color('CO', 'green'));
    else log('  Xac thuc quan tri: ' + color('KHONG', 'yellow') + ' (dat KTNB_ADMIN_USER/KTNB_ADMIN_PASS de kiem tra sau dang nhap)');
  } else {
    log('  Dich ' + color('KHONG PHAN HOI', 'red') + ' (' + (ctx.probe.error || 'HTTP ' + ctx.probe.status) + ')');
    log('  ' + color('Chi chay cac phep kiem tinh (SAST, A06).', 'yellow'));
  }

  // 3. Chon nhom se chay
  const offlineOnly = ['SAST', 'A06'];
  let selected = checks;
  if (args.only) selected = selected.filter((c) => args.only.includes(c.id));
  if (args.skip) selected = selected.filter((c) => !args.skip.includes(c.id));
  if (!targetAlive) selected = selected.filter((c) => offlineOnly.includes(c.id));

  // 4. Chay tung nhom
  for (const mod of selected) {
    report.startSuite(mod.id, mod.name);
    const before = report.findings.length;
    process.stdout.write('\n  [' + mod.id + '] ' + mod.name + ' ... ');
    const ts = Date.now();
    try {
      await mod.run(ctx);
      const n = report.findings.length - before;
      const dt = ((Date.now() - ts) / 1000).toFixed(1);
      log(n ? color(n + ' phat hien', n >= 3 ? 'red' : 'yellow') + ' (' + dt + 's)' : color('dat', 'green') + ' (' + dt + 's)');
    } catch (e) {
      log(color('LOI', 'red') + ': ' + (e && e.message));
      report.error(mod.id + '-ERR', (e && e.stack) || String(e));
    }
    report.endSuite();
  }

  report.meta.durationMs = Date.now() - t0;
  report.meta.finishedAt = new Date().toISOString();
  report.meta.targetAlive = targetAlive;
  report.meta.safeMode = safeMode;

  // 5. Xuat bao cao
  const files = writeReports(report, outDir);

  // 6a. Che do --json: chi in JSON ra stdout
  if (args.json) {
    const s0 = report.summary();
    process.stdout.write(JSON.stringify({ report, summary: s0, files }, null, 2));
    return report.findings.some((f) => failOn.includes(f.severity)) ? 1 : 0;
  }

  // 6. In tom tat
  const s = report.summary();
  banner('TOM TAT');
  for (const k of ['critical', 'high', 'medium', 'low', 'info']) {
    const n = s.bySeverity[k] || 0;
    const line = '  ' + (SEV_ICON[k] || '') + ' ' + k.padEnd(9) + ': ' + n;
    log(n ? color(line, k === 'critical' || k === 'high' ? 'red' : 'yellow') : line);
  }
  log('  ' + '-'.repeat(40));
  log('  Tong phat hien: ' + s.total + '  |  Phep kiem: ' + s.checks + '  |  Loi chay: ' + s.errors);

  if (safeMode) {
    const skipped = report.findings.filter((f) => f.id.endsWith('-SKIP'));
    log('\n  ' + color('CHE DO AN TOAN', 'yellow') + ': da bo qua ' + skipped.length + ' phep kiem co the thay doi du lieu.');
    log('  ' + color('Cac phep kiem nay PHAI chay thu cong tren moi truong test.', 'yellow'));
  }

  log('\n  Bao cao:');
  log('    - ' + files.markdown);
  log('    - ' + files.json);
  log('    - ' + files.sarif);

  if (args.verbose && report.findings.length) {
    banner('CHI TIET');
    for (const f of sortFindings(report.findings)) {
      log('  ' + (SEV_ICON[f.severity] || '') + ' [' + f.severity.toUpperCase() + '] ' + f.id + ' - ' + f.title);
      log('      ' + f.detail);
      if (f.url) log('      URL: ' + f.url);
      if (f.evidence) log('      Bang chung: ' + String(f.evidence).replace(/\s+/g, ' ').slice(0, 160));
      if (f.remediation) log('      Khac phuc: ' + f.remediation);
    }
  }

  // 7. Ma thoat theo nguong
  const blocking = report.findings.filter((f) => failOn.includes(f.severity));
  if (blocking.length) {
    log('\n' + color('KET QUA: THAT BAI', 'red') + ' - ' + blocking.length + ' phat hien o muc ' + failOn.join('/') + '.');
    return 1;
  }
  log('\n' + color('KET QUA: DAT', 'green') + ' - khong co phat hien o muc ' + failOn.join('/') + '.');
  return 0;
}

main().then((code) => { process.exitCode = code; }).catch((e) => {
  console.error('\nLoi khong xu ly:', (e && e.stack) || e);
  process.exitCode = 2;
});