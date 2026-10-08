'use strict';
// Phan tich ma nguon tinh (SAST nhe) - khong can dich chay
const fs = require('fs');
const path = require('path');
const { SEVERITY } = require('../lib/config');

const MODULE = { id: 'SAST', name: 'Phan tich ma nguon tinh (SAST)' };

const SKIP_DIR = /node_modules|[\\/]\.git|[\\/]dist|[\\/]build|[\\/]coverage|[\\/]\.next|[\\/]release-bundle|[\\/]scripts[\\/]security/;

function collect(dir, exts, out) {
  let es = [];
  try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of es) {
    const p = path.join(dir, e.name);
    if (SKIP_DIR.test(p)) continue;
    if (e.isDirectory()) collect(p, exts, out);
    else if (exts.test(e.name) && !/\.(spec|test)\./.test(e.name)) out.push(p);
  }
  return out;
}

// --- Ho tro trich xuat doi so thu nhat cua loi goi ham ---------------------
// Can thiet de phan biet: query(`... ${x}`)  [NGUY HIEM]
//                    va: query(`... $1`, [`${x}%`])  [AN TOAN - tham so hoa]
function skipString(s, i) {
  const q = s[i];
  i++;
  while (i < s.length) {
    if (s[i] === '\\') { i += 2; continue; }
    if (s[i] === q) return i + 1;
    i++;
  }
  return i;
}

function firstArg(s, open) {
  let i = open + 1, depth = 1, start = i;
  while (i < s.length) {
    const c = s[i];
    if (c === '"' || c === "'" || c === '`') { i = skipString(s, i); continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') { depth--; if (depth === 0) break; }
    else if (c === ',' && depth === 1) break;
    i++;
  }
  return s.slice(start, i);
}

// Noi suy trong chuoi SQL -> SQL Injection
function dynamicSql(text) {
  const out = [];
  const re = /(?<![.\w$])(query|execute|raw|\$queryRawUnsafe|\$executeRawUnsafe)\s*\(/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const name = m[1];
    const open = m.index + m[0].length - 1;
    const arg = firstArg(text, open);
    const unsafeApi = /Unsafe$/.test(name);
    const interp = /\$\{/.test(arg);
    const concat = /['\"`]\s*\+\s*[A-Za-z_$]/.test(arg);
    if (unsafeApi || interp || concat) out.push(m.index);
  }
  return out;
}

// Nguon du lieu KHONG dang tin: tham so HTTP, argv, env, tham so ham...
const TAINT_SRC = /\b(req|request|res|ctx)\s*\.|\bprocess\.(argv|env)\b|\b(body|query|params|headers|dto|payload|input|userInput)\b/;
// Nguon AN TOAN: hang so, duong dan noi bo, mang hang so
const SAFE_SRC = /^\s*(['"`][^'"`]*['"`]|path\.(resolve|join)|__dirname|__filename|require\s*\(|\.replace\s*\()/;

// Xac dinh mot bien trong tep co phai CHI duoc gan tu hang so noi bo khong.
// true  = chi tu hang so noi bo (khong the bi tan cong)
// false = co the nhan du lieu tu nguon ngoai (hoac khong ro) -> coi la nguy hiem
// Cac phuong thuc bien doi chuoi KHONG lam mat tinh 'noi bo' cua du lieu
const SAFE_METHOD = /^(replace|trim|toLowerCase|toUpperCase|split|join|slice|substring|filter|map|toString|concat|padStart|padEnd|normalize)$/;

// Lay khoi ngoac can bang tu vi tri mo (ho tro mang/doi tuong trai nhieu dong)
function bracketBlock(text, start) {
  const open = text[start];
  const close = open === '[' ? ']' : open === '{' ? '}' : open === '(' ? ')' : null;
  if (!close) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === open) depth++;
    else if (text[i] === close) { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}

// Trich cac bieu thuc day du trong template literal (phan ${...}), ke ca ngoac long nhau
function interpExprs(s) {
  const out = [];
  for (let i = 0; i < s.length - 1; i++) {
    if (s.charCodeAt(i) === 36 && s.charCodeAt(i + 1) === 123) {
      let depth = 0, j = i + 1;
      for (; j < s.length; j++) {
        const c = s.charCodeAt(j);
        if (c === 123) depth++;
        else if (c === 125) { depth--; if (depth === 0) break; }
      }
      out.push(s.slice(i + 2, j));
      i = j;
    }
  }
  return out;
}

// Mot BIEU THUC noi suy co chi xuat phat tu du lieu noi bo khong?
function exprLocalOnly(text, expr, depth) {
  const e = String(expr).trim();
  if (TAINT_SRC.test(e)) return false;
  if (/^['"`]/.test(e) || /^(true|false|null|undefined|\d+)$/.test(e)) return true;
  if (/^(path\.(resolve|join|basename|dirname)|__dirname|__filename)\b/.test(e)) return true;
  if (/^(String|Number|Boolean)\s*\(/.test(e)) return true;
  const call = e.match(/^([A-Za-z_36][\w36]*)((?:\.[A-Za-z_36][\w36]*)*)\.([A-Za-z_36][\w36]*)\s*\(/);
  if (call && SAFE_METHOD.test(call[3])) return isLocalOnly(text, call[1], depth + 1);
  if (/^[A-Za-z_36][\w36]*$/.test(e)) return isLocalOnly(text, e, depth + 1);
  return false;
}

// RHS cua mot lan gan co phai chi xuat phat tu hang so noi bo khong?
function rhsLocalOnly(text, rhs, depth) {
  const s = String(rhs).trim();
  if (TAINT_SRC.test(s)) return false;                      // co nguon nguoi dung -> nguy hiem
  if (/^['"`][^'"`]*['"`]$/.test(s)) return true;          // chuoi hang so
  if (/^`[^`]*`$/.test(s) && !/\$\{/.test(s)) return true;  // template khong noi suy
  if (/^(true|false|null|undefined|\d+)$/.test(s)) return true;
  if (/^(path\.(resolve|join|basename|dirname)|__dirname|__filename|require)\s*\(/.test(s)) return true;
  if (/^(String|Number|Boolean)\s*\(/.test(s)) return true;
  // Mang/doi tuong hang so: khong chua nguon nguoi dung thi van la du lieu noi bo
  if (/^[\[{]/.test(s)) return !TAINT_SRC.test(s);
  // <bien>.<phuong thuc an toan>(...) -> phan tich tiep tren <bien>
  const call = s.match(/^([A-Za-z_$][\w$]*)((?:\.[A-Za-z_$][\w$]*)*)\.([A-Za-z_$][\w$]*)\s*\(/);
  if (call && SAFE_METHOD.test(call[3])) return isLocalOnly(text, call[1], depth + 1);
  return false;                                             // khong ro nguon -> coi la nguy hiem
}

// Xac dinh mot bien trong tep co phai CHI duoc gan tu hang so noi bo khong.
// true  = chi tu hang so noi bo (khong the bi tan cong)
// false = co the nhan du lieu tu nguon ngoai (hoac khong ro) -> coi la nguy hiem
function isLocalOnly(text, name, depth) {
  const d = depth || 0;
  if (d > 4) return false;
  const esc = String(name).replace(/[$]/g, '\\$');
  let sawOrigin = false;
  // 1) Lan gan bang const/let/var
  const re = new RegExp('(?:const|let|var)\\s+' + esc + '\\s*=\\s*([^;\\n]+)', 'g');
  let m;
  while ((m = re.exec(text)) !== null) {
    sawOrigin = true;
    // Neu RHS mo bang '[' hoac '{' thi lay ca khoi (mang/doi tuong trai nhieu dong)
    let rhs = m[1];
    const rhsStart = m.index + m[0].length - m[1].length;
    if (text[rhsStart] === '[' || text[rhsStart] === '{') {
      const blk = bracketBlock(text, rhsStart);
      if (blk) rhs = blk;
    }
    if (!rhsLocalOnly(text, rhs, d)) return false;
  }
  // 2) Tham so cua forEach/map/... duyet mot mang hang so
  const iterRe = new RegExp('([A-Za-z_$][\\w$.]*)\\s*\\.\\s*(?:forEach|map|filter|some|every|find)\\s*\\(\\s*\\(?\\s*' + esc + '\\b', 'g');
  while ((m = iterRe.exec(text)) !== null) {
    sawOrigin = true;
    if (!isLocalOnly(text, m[1], d + 1)) return false;
  }
  // 3) Vong lap for (const NAME of ARR)
  const ofRe = new RegExp('for\\s*\\(\\s*(?:const|let|var)\\s+' + esc + '\\s+of\\s+([A-Za-z_$][\\w$.]*)', 'g');
  while ((m = ofRe.exec(text)) !== null) {
    sawOrigin = true;
    if (!isLocalOnly(text, m[1], d + 1)) return false;
  }
  return sawOrigin;
}

// Lenh he thong duoc dung dong -> Command Injection
// execSync('lenh hang so') KHONG phai lo hong.
// Tra ve mang { index, localOnly } de phan biet muc do nghiem trong.
function dynamicExec(text) {
  const out = [];
  const re = /(?<![.\w])(exec|execSync)\s*\(/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const open = m.index + m[0].length - 1;
    const arg = firstArg(text, open);
    const interp = /\$\{/.test(arg);
    const concat = /['"`]\s*\+/.test(arg);
    const bareVar = /^\s*[A-Za-z_$][\w$.]*\s*$/.test(arg);
    if (!(interp || concat || bareVar)) continue;
    // Lay day du cac bieu thuc noi suy (khong chi dinh danh dau tien)
    const exprs = interpExprs(arg);
    if (bareVar) exprs.push(arg.trim());
    const localOnly = exprs.length > 0 && exprs.every((e) => exprLocalOnly(text, e, 0));
    out.push({ index: m.index, localOnly });
  }
  const re2 = /spawn\s*\([^)]*shell\s*:\s*true/g;
  while ((m = re2.exec(text)) !== null) out.push({ index: m.index, localOnly: false });
  return out;
}

// --- Quy tac ---------------------------------------------------------------
const RULES = [
  { id: 'SAST-01', sev: 'critical', detect: dynamicSql,
    title: 'SQL noi chuoi (nguy co SQL Injection)',
    desc: 'Truy van duoc tao bang cach noi suy/noi chuoi thay vi tham so hoa.',
    fix: 'Dung tham so hoa: query(sql, [params]) hoac query builder.' },
  { id: 'SAST-02', sev: 'critical', detect: dynamicExec,
    title: 'Thuc thi lenh he thong voi du lieu dong (nguy co Command Injection)',
    desc: 'Lenh he thong duoc dung tu chuoi noi suy/bien thay vi hang so.',
    fix: 'Dung execFile voi mang tham so; allowlist lenh; tranh shell.' },
  { id: 'SAST-03', sev: 'medium', re: /(?<![.\w])eval\s*\(|new\s+Function\s*\(|vm\.runInNewContext|vm\.runInThisContext/g,
    title: 'Thuc thi ma dong (eval/new Function)',
    desc: 'Danh gia ma dong co the dan den RCE neu du lieu khong dang tin.',
    fix: 'Loai bo eval; dung trinh phan tich/bieu thuc an toan.' },
  { id: 'SAST-04', sev: 'high', re: /jwt\.verify\s*\([^)]*ignoreExpiration\s*:\s*true/g,
    title: 'Bo qua kiem tra het han JWT',
    desc: 'ignoreExpiration: true lam token khong bao gio het han.',
    fix: 'Bo tuy chon ignoreExpiration.' },
  { id: 'SAST-05', sev: 'critical', re: /algorithms\s*:\s*\[\s*['\"]none['\"]/gi,
    title: 'Cho phep thuat toan JWT none',
    desc: 'Cau hinh algorithms chua none.',
    fix: 'Chi cho phep HS256/RS256.' },
  { id: 'SAST-06', sev: 'high', re: /(password|secret|apiKey|api_key|token)\s*[:=]\s*['\"][A-Za-z0-9_\-]{12,}['\"]/gi,
    title: 'Bi mat bi ghi cung trong ma nguon',
    desc: 'Phat hien chuoi co dang bi mat duoc gan truc tiep.',
    fix: 'Chuyen sang bien moi truong / secret manager.' },
  { id: 'SAST-07', sev: 'low', re: /dangerouslySetInnerHTML/g,
    title: 'Do HTML truc tiep (can xac minh da lam sach)',
    desc: 'dangerouslySetInnerHTML duoc dung - xac minh moi du lieu deu qua bo lam sach.',
    fix: 'Dung DOMPurify/sanitize-html va viet test cho truong hop XSS.' },
  { id: 'SAST-08', sev: 'medium', re: /(res|reply)\.(send|json|status)\s*\([^;]{0,80}\.stack/g,
    title: 'Tra stack trace cho client',
    desc: 'Phan hoi chua stack trace noi bo.',
    fix: 'Dung exception filter, chi tra thong bao chung.' },
  { id: 'SAST-09', sev: 'medium', re: /rejectUnauthorized\s*:\s*false/g,
    title: 'Tat kiem tra chung chi TLS',
    desc: 'rejectUnauthorized: false cho phep MITM.',
    fix: 'Bat xac minh chung chi.' },
  { id: 'SAST-10', sev: 'medium', re: /cors\s*\(\s*\{\s*origin\s*:\s*(true|['\"]\*['\"])/g,
    title: 'CORS mo cho moi origin',
    desc: 'origin: true/* cho phep moi ten mien.',
    fix: 'Dung danh sach trang cu the.' },
  { id: 'SAST-12', sev: 'medium', re: /console\.log\s*\([^)]*(password|token|secret|otp)/gi,
    title: 'Ghi log thong tin nhay cam',
    desc: 'console.log chua mat khau/token.',
    fix: 'Loai bo hoac che thong tin nhay cam khi ghi log.' },
];

// Ma nguon khong duoc trien khai (script build/dev) khong nam trong be mat tan cong
const DEV_ONLY = /^(scripts\/|frontend\/e2e\/|.*\.config\.)/;
const DOWNGRADE = { critical: 'high', high: 'medium', medium: 'low', low: 'info', info: 'info' };
function calibrate(sev, file) { return DEV_ONLY.test(file) ? (DOWNGRADE[sev] || sev) : sev; }

async function run(ctx) {
  const { report } = ctx;
  const R = (sev, id, title, detail, extra) => report.fail(sev, id, title, detail, extra);
  const root = process.cwd();
  const files = [];
  for (const d of ['backend/src', 'frontend/src', 'scripts']) collect(path.join(root, d), /\.(ts|tsx|js|jsx|cjs|mjs)$/, files);
  report.meta.sast = { filesScanned: files.length };

  const hits = {};
  for (const f of files) {
    let text;
    try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
    const rel = path.relative(root, f).replace(/\\/g, '/');
    const lines = text.split(/\r?\n/);
    for (const rule of RULES) {
      let indices = [];
      if (rule.detect) indices = rule.detect(text);
      else {
        rule.re.lastIndex = 0;
        let m;
        while ((m = rule.re.exec(text)) !== null) {
          indices.push(m.index);
          if (rule.re.lastIndex === m.index) rule.re.lastIndex++;
        }
      }
      if (!indices.length) continue;
      // Chuan hoa: detect co the tra ve so hoac { index, localOnly }
      const marks = indices.map((x) => (typeof x === 'number' ? { index: x, localOnly: false } : x));
      const real = marks.filter((x) => !x.localOnly);
      const localOnlyCount = marks.length - real.length;
      // Neu TAT CA vi tri deu chi dung du lieu noi bo -> khong phai lo hong that su,
      // chi ghi nhan muc thap de ra soat.
      if (!real.length) {
        const loc0 = text.slice(0, marks[0].index).split('\n').length;
        R(SEVERITY.LOW, rule.id + '-LOCAL', rule.title + ' (du lieu noi bo)',
          'Moi vi tri trong ' + rel + ' chi noi suy tu hang so/duong dan noi bo, khong co nguon du lieu nguoi dung. Khong phai lo hong Command Injection that su.',
          { url: rel + ':' + loc0,
            evidence: marks.slice(0, 5).map((x) => { const ln = text.slice(0, x.index).split('\n').length; return 'dong ' + ln + ': ' + (lines[ln - 1] || '').trim().slice(0, 160); }).join(' | '),
            remediation: 'Khong bat buoc. Co the dung execFile voi mang tham so de ro rang hon.' });
        continue;
      }
      const locs = real.slice(0, 5).map((x) => {
        const lineNo = text.slice(0, x.index).split('\n').length;
        return { line: lineNo, snippet: (lines[lineNo - 1] || '').trim().slice(0, 160) };
      });
      const sev = calibrate(rule.sev, rel);
      R(SEVERITY[sev.toUpperCase()] || sev, rule.id, rule.title,
        rule.desc + ' (' + real.length + ' vi tri trong ' + rel + (localOnlyCount ? ', ' + localOnlyCount + ' vi tri chi dung du lieu noi bo da bo qua' : '') + ')',
        { url: rel + ':' + locs[0].line,
          evidence: locs.map((l) => 'dong ' + l.line + ': ' + l.snippet).join(' | ') + (sev !== rule.sev ? ' [da ha muc do: ma nguon khong trien khai]' : ''),
          remediation: rule.fix });
    }
  }
  if (!report.findings.length) report.pass();
}

module.exports = Object.assign({}, MODULE, { run });
