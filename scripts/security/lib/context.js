'use strict';
// Ngu canh phien kiem thu: dang nhap, tao client co/khong token
const { createClient, extractToken } = require('./http');

const DEFAULT_CREDS = {
  admin: { username: process.env.KTNB_ADMIN_USER || 'admin', password: process.env.KTNB_ADMIN_PASS || '' },
  user: { username: process.env.KTNB_USER_USER || 'ktv01', password: process.env.KTNB_USER_PASS || '' },
};

async function login(baseUrl, creds, timeout) {
  const c = createClient({ timeout });
  const res = await c.post(baseUrl + '/api/auth/login', { body: { username: creds.username, password: creds.password } });
  const token = extractToken(res.body);
  return { ok: !!token, status: res.status, token, body: res.body, res };
}

// Tao ngu canh: client an danh + client da xac thuc (neu co thong tin dang nhap)
async function buildContext(args, baseUrl, report) {
  const timeout = args.timeout;
  const anon = createClient({ timeout });
  const context = { baseUrl, anon, args, report, auth: { admin: null, user: null }, authed: null, canAuth: false };

  // Phat hien dich co song khong
  const probe = await anon.get(baseUrl + '/api/health', { timeout: 5000 });
  context.alive = probe.ok && probe.status >= 200 && probe.status < 500;
  context.probe = probe;

  // Thu dang nhap admin neu co mat khau
  if (DEFAULT_CREDS.admin.password) {
    const r = await login(baseUrl, DEFAULT_CREDS.admin, timeout);
    context.auth.admin = r;
    if (r.ok) { context.authed = createClient({ timeout, headers: { Authorization: 'Bearer ' + r.token } }); context.canAuth = true; }
  }
  if (DEFAULT_CREDS.user.password) {
    const r2 = await login(baseUrl, DEFAULT_CREDS.user, timeout);
    context.auth.user = r2;
    if (r2.ok) context.authedUser = createClient({ timeout, headers: { Authorization: 'Bearer ' + r2.token } });
  }
  return context;
}

module.exports = { buildContext, login, DEFAULT_CREDS };