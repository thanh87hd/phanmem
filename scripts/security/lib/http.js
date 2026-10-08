'use strict';
// HTTP client cho kiem thu bao mat: do thoi gian, kiem soat redirect, khong nem loi mang

function createClient(opts) {
  const timeout = (opts && opts.timeout) || 10000;
  const defaultHeaders = (opts && opts.headers) || {};

  async function req(method, url, options) {
    const o = options || {};
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), o.timeout || timeout);
    const started = Date.now();
    const headers = Object.assign({}, defaultHeaders, o.headers || {});
    const init = { method, headers, redirect: o.redirect || 'manual', signal: ctrl.signal };
    if (o.body !== undefined && o.body !== null) {
      if (typeof o.body === 'string' || Buffer.isBuffer(o.body)) init.body = o.body;
      else { init.body = JSON.stringify(o.body); if (!headers['Content-Type']) headers['Content-Type'] = 'application/json'; }
    }
    try {
      const res = await fetch(url, init);
      const text = await res.text();
      const hdrs = {};
      res.headers.forEach((v, k) => { hdrs[k.toLowerCase()] = v; });
      return { ok: true, status: res.status, headers: hdrs, body: text, ms: Date.now() - started, url };
    } catch (err) {
      return { ok: false, status: 0, headers: {}, body: '', ms: Date.now() - started, url,
        error: (err && err.name === 'AbortError') ? 'TIMEOUT' : String((err && err.message) || err) };
    } finally { clearTimeout(timer); }
  }

  return {
    get: (u, o) => req('GET', u, o),
    post: (u, o) => req('POST', u, o),
    put: (u, o) => req('PUT', u, o),
    patch: (u, o) => req('PATCH', u, o),
    del: (u, o) => req('DELETE', u, o),
    options: (u, o) => req('OPTIONS', u, o),
    raw: req,
  };
}

// Trich xuat access token tu nhieu dang phan hoi khac nhau
function extractToken(body) {
  if (!body) return null;
  let data;
  try { data = typeof body === 'string' ? JSON.parse(body) : body; } catch { return null; }
  if (!data || typeof data !== 'object') return null;
  return data.access_token || data.accessToken || data.token || (data.data && (data.data.access_token || data.data.token)) || null;
}

module.exports = { createClient, extractToken };
