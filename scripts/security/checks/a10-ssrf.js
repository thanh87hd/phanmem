'use strict';
// A10:2021 - Server-Side Request Forgery (SSRF)
const { SEVERITY } = require('../lib/config');
const P = require('../lib/payloads');

const MODULE = { id: 'A10', name: 'Server-Side Request Forgery (SSRF)' };

const URL_KEYS = ['url', 'uri', 'link', 'endpoint', 'target', 'host', 'dest', 'destination', 'redirect', 'callback', 'webhook', 'feed', 'source', 'path', 'file', 'image', 'proxy', 'apiUrl', 'baseUrl', 'server'];

function urlRoutes(routes) {
  return routes.filter((r) => /(proxy|fetch|external|sync|import|webhook|callback|preview|link|url|download|remote|integration|connect)/i.test(r.url));
}

const INTERNAL_MARKERS = /root:x:0:0|\[extensions\]|ami-id|instance-id|iam\/security-credentials|computeMetadata|redis_version|SSH-2\.0|PostgreSQL|MongoDB|Elasticsearch/i;

async function run(ctx) {
  const { anon, authed, baseUrl, report, routes } = ctx;
  const R = (sev, id, title, detail, extra) => report.fail(sev, id, title, detail, extra);
  const client = authed || anon;

  const cand = urlRoutes(routes);
  if (!cand.length) report.error('A10-01', 'Khong tim thay route nghi van nhan URL');

  let hits = 0;
  for (const r of cand.slice(0, 25)) {
    for (const payload of P.SSRF.slice(0, 6)) {
      for (const key of URL_KEYS.slice(0, 4)) {
        let res;
        if (r.method === 'GET') {
          const u = baseUrl + r.sampleUrl + (r.sampleUrl.includes('?') ? '&' : '?') + key + '=' + encodeURIComponent(payload);
          res = await client.get(u);
        } else {
          const b = {}; b[key] = payload; b.url = payload;
          res = await client.raw(r.method, baseUrl + r.sampleUrl, { body: JSON.stringify(b), headers: { 'Content-Type': 'application/json' } });
        }
        if (!res.ok) continue;
        if (res.status >= 200 && res.status < 300 && INTERNAL_MARKERS.test(res.body)) {
          hits++;
          R(SEVERITY.CRITICAL, 'A10-01', 'SSRF - truy cap tai nguyen noi bo', r.method + ' ' + r.url + ' voi ' + key + '=' + payload + ' tra ve dau hieu dich noi bo.',
            { url: r.url, evidence: String(res.body).slice(0, 300), remediation: 'Dung allowlist ten mien; chan IP noi bo (127.0.0.0/8, 169.254.0.0/16, 10/8, 172.16/12, 192.168/16); khong theo redirect; phan giai DNS roi kiem tra IP.' });
          break;
        }
        if (res.status >= 200 && res.status < 300 && /(file|gopher|dict):\/\//.test(payload) && res.body.length > 2 && !/invalid|khong hop le|not allowed/i.test(res.body)) {
          hits++;
          R(SEVERITY.HIGH, 'A10-01', 'SSRF - giao thuc nguy hiem duoc chap nhan', r.method + ' ' + r.url + ' chap nhan ' + payload, { url: r.url, evidence: String(res.body).slice(0, 250), remediation: 'Chi cho phep http/https; chan file/gopher/dict/ftp.' });
          break;
        }
      }
      if (hits > 4) break;
    }
    if (hits > 4) break;
  }
  if (!hits) report.pass();

  // A10-02: Open redirect
  const redirects = ['//evil.example', 'https://evil.example', 'https:evil.example'];
  for (const p of redirects) {
    const r = await anon.get(baseUrl + '/api/auth/login?redirect=' + encodeURIComponent(p), { redirect: 'manual' });
    const loc = r.headers['location'] || '';
    if (loc && /evil\.example/.test(loc)) {
      R(SEVERITY.MEDIUM, 'A10-02', 'Open redirect', 'Tham so redirect duoc dung truc tiep trong Location: ' + loc, { url: baseUrl + '/api/auth/login?redirect=' + p, remediation: 'Chi cho phep duong dan noi bo; kiem tra allowlist ten mien.' });
      break;
    }
  }
  report.pass();

  // A10-03: Host header injection
  const hh = await anon.get(baseUrl + '/api/auth/forgot-password', { headers: { Host: 'evil.example' } });
  if (hh.ok && /evil\.example/.test(hh.body)) {
    R(SEVERITY.MEDIUM, 'A10-03', 'Host header injection', 'Gia tri Host bi phan anh trong phan hoi (co the dung de dau doc email/link).', { url: baseUrl + '/api/auth/forgot-password', evidence: String(hh.body).slice(0, 200), remediation: 'Dung ten mien cau hinh co dinh thay vi header Host.' });
  } else report.pass();
}

module.exports = Object.assign({}, MODULE, { run });