'use strict';
// Cau hinh cho bo test bao mat KTNB 4.0
const os = require('os');
const path = require('path');

const SEVERITY = Object.freeze({
  CRITICAL: 'critical', HIGH: 'high', MEDIUM: 'medium', LOW: 'low', INFO: 'info',
});

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

// Nguong cho phep fail CI (mac dinh: fail neu co high tro len)
const DEFAULT_FAIL_ON = ['critical', 'high'];

// Target duoc coi la NGUY HIEM (production that) -> tu dong bat che do an toan,
// khong chay cac phep kiem thay doi trang thai.
const DANGEROUS_TARGETS = ['vps', 'prod'];

const TARGETS = {
  local: 'http://127.0.0.1:3001',
  dev: 'http://127.0.0.1:3001',
  vps: process.env.KTNB_VPS_URL || 'https://ktnb.io.vn',
  prod: process.env.KTNB_PROD_URL || 'https://ktnb.io.vn',
};

function parseArgs(argv) {
  // Ho tro ca dang '--key value' va '--key=value'
  const flat = [];
  for (const a of argv) {
    const m = /^(--[a-zA-Z-]+)=(.*)$/.exec(a);
    if (m) { flat.push(m[1]); flat.push(m[2]); } else flat.push(a);
  }
  argv = flat;
  const args = { target: 'local', baseUrl: null, out: null, failOn: null, timeout: 10000,
    verbose: false, json: false, only: null, skip: null, routes: null, safe: false, unsafe: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--target' || a === '-t') args.target = next();
    else if (a === '--url' || a === '-u') args.baseUrl = next();
    else if (a === '--out' || a === '-o') args.out = next();
    else if (a === '--fail-on') args.failOn = next().split(',').map((s) => s.trim());
    else if (a === '--timeout') args.timeout = parseInt(next(), 10);
    else if (a === '--safe') args.safe = true;
    else if (a === '--unsafe') args.unsafe = true;
    else if (a === '--routes') args.routes = next();
    else if (a === '--only') args.only = next().split(',').map((s) => s.trim().toUpperCase());
    else if (a === '--skip') args.skip = next().split(',').map((s) => s.trim().toUpperCase());
    else if (a === '--verbose' || a === '-v') args.verbose = true;
    else if (a === '--json') args.json = true;
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

// Che do an toan: khong chay phep kiem lam thay doi du lieu/cau hinh.
// Bat tu dong khi nham vao VPS/production, tru khi nguoi dung ep --unsafe.
function isSafeMode(args) {
  if (args.unsafe) return false;
  if (args.safe) return true;
  if (args.baseUrl && !/localhost|127\.0\.0\.1|::1/.test(args.baseUrl)) return true;
  return DANGEROUS_TARGETS.includes(args.target);
}

function resolveTarget(args) {
  if (args.baseUrl) return args.baseUrl.replace(/\/$/, '');
  const t = TARGETS[args.target];
  if (!t) throw new Error('Target khong hop le: ' + args.target + '. Dung: ' + Object.keys(TARGETS).join(', '));
  return t.replace(/\/$/, '');
}

function defaultOutDir() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return path.join(process.cwd(), 'security-reports', stamp);
}

function helpText() {
  return [
    'Bo test bao mat KTNB 4.0',
    '',
    'Cach dung: node scripts/security/run-security-suite.js [tuy chon]',
    '',
    '  -t, --target <ten>   local | dev | vps | prod  (mac dinh: local)',
    '  -u, --url <url>      Ghi de bang URL day du, vi du https://ktnb.io.vn',
    '  -o, --out <dir>      Thu muc xuat bao cao (mac dinh security-reports/<timestamp>)',
    '      --fail-on <list> Muc do lam CI fail, mac dinh critical,high',
    '      --safe           Che do an toan: KHONG chay phep kiem thay doi du lieu (mac dinh bat voi vps/prod)',
    '      --unsafe         Cho phep chay phep kiem thay doi du lieu (CHI dung tren moi truong test)',
    '      --routes <file>  Nap danh sach route tu tep JSON (thay vi doc ma nguon)',
    '      --only <list>    Chi chay cac nhom A01,A03,...',
    '      --skip <list>    Bo qua cac nhom A01,A03,...',
    '      --timeout <ms>   Timeout moi request (mac dinh 10000)',
    '  -v, --verbose        In chi tiet tung phep kiem',
    '      --json           Chi in JSON ra stdout',
    '  -h, --help           Hien tro giup',
  ].join(os.EOL);
}

module.exports = { SEVERITY, SEVERITY_ORDER, DEFAULT_FAIL_ON, TARGETS, DANGEROUS_TARGETS, parseArgs, resolveTarget, defaultOutDir, helpText, isSafeMode };
