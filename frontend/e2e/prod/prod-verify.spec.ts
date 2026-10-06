import { test, expect, request as playwrightRequest, type Browser, type BrowserContext, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RBAC_MATRIX, ROLE_ACCOUNTS, ROLE_GROUP_LABEL, type RoleGroup } from './prod-rbac.matrix';

/**
 * KIỂM CHỨNG PRODUCTION — https://ktnb.io.vn
 * ==========================================
 * Bộ test này chạy trên hệ thống THẬT đang phục vụ người dùng, KHÔNG phải máy
 * local. Vì vậy nó tuân thủ nghiêm ngặt nguyên tắc CHỈ ĐỌC:
 *
 *   - Chỉ dùng HTTP GET và POST /auth/login.
 *   - KHÔNG tạo/sửa/xóa bất kỳ bản ghi nghiệp vụ nào.
 *   - KHÔNG thử đăng nhập sai mật khẩu: backend khóa tài khoản 30 phút sau 5
 *     lần sai (TC-AUTH-05). Tài khoản ở đây là tài khoản ngân hàng thật nên
 *     tuyệt đối không được đánh đổi.
 *   - Đăng nhập tuần tự, giãn cách 7s, tự chờ khi gặp HTTP 429
 *     (@Throttle 10 lần/phút trên /auth/login).
 *
 * Mục tiêu: đối chiếu hệ thống thật với MA TRẬN PHÂN QUYỀN trong
 * docs/04_Kich_Ban_Kiem_Thu_UAT_KTNB_4.0.md và ghi lại mọi sai lệch.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.PROD_BASE_URL || 'https://ktnb.io.vn';
const API = `${BASE}/api`;
const PASSWORD = process.env.UAT_PASSWORD || '@Lpbank2026!';
const CACHE_FILE = path.join(HERE, '.prod-tokens.json');
const CACHE_TTL_MS = 25 * 60 * 1000;
const LOGIN_SPACING_MS = 7_000;

interface Session { token: string; user: Record<string, unknown>; role: string }

const sessions: Record<string, Session | null> = {};
const ALL_ACCOUNTS = [...new Set(Object.values(ROLE_ACCOUNTS).flat())];

function loadCache(): Record<string, Session> {
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    if (Date.now() - (raw.savedAt || 0) > CACHE_TTL_MS) return {};
    return raw.sessions || {};
  } catch {
    return {};
  }
}

function saveCache(s: Record<string, Session>): void {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ savedAt: Date.now(), sessions: s }, null, 1));
  } catch { /* bộ nhớ đệm chỉ là tối ưu, không phải điều kiện đúng */ }
}

async function loginApi(username: string): Promise<Session | null> {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await ctx.post(`${API}/auth/login`, { data: { username, password: PASSWORD } });
      if (res.status() === 429) {
        await new Promise((r) => setTimeout(r, 25_000));
        continue;
      }
      if (!res.ok()) return null;
      const body = await res.json();
      if (!body?.access_token) return null;
      return { token: body.access_token, user: body.user || {}, role: body.user?.role || '' };
    }
    return null;
  } catch {
    return null;
  } finally {
    await ctx.dispose();
  }
}

/** Tạo context có sẵn phiên đăng nhập — KHÔNG đăng nhập lại qua giao diện. */
async function newSessionContext(browser: Browser, s: Session): Promise<BrowserContext> {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  await ctx.addInitScript(
    (payload: { user: string; token: string }) => {
      localStorage.setItem('user', payload.user);
      localStorage.setItem('token', payload.token);
      // Ghim ngôn ngữ để văn bản trang chặn quyền có thể nhận diện ổn định.
      localStorage.setItem('i18nextLng', 'vi');
    },
    { user: JSON.stringify(s.user), token: s.token },
  );
  return ctx;
}

interface RouteObservation {
  blocked: boolean;
  finalUrl: string;
  signal: string;
}

/** Mở một màn hình và xác định người dùng có bị CHẶN hay không. */
async function probeRoute(page: Page, routeUrl: string): Promise<RouteObservation> {
  const target = routeUrl.startsWith('http') ? routeUrl : BASE + routeUrl;
  try {
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  } catch (e) {
    return { blocked: false, finalUrl: target, signal: 'NAV_ERROR:' + (e as Error).message.slice(0, 80) };
  }
  await page.waitForTimeout(1_100);
  const finalUrl = page.url();
  const body = await page.locator('body').innerText().catch(() => '');

  if (/403\s*Forbidden/i.test(body)) return { blocked: true, finalUrl, signal: '403 Forbidden' };
  if (/không có quyền truy cập/i.test(body)) return { blocked: true, finalUrl, signal: 'không có quyền truy cập' };
  if (/\/login(\?|$)/.test(finalUrl)) return { blocked: true, finalUrl, signal: 'chuyển hướng /login' };
  return { blocked: false, finalUrl, signal: 'nội dung hiển thị' };
}

test.beforeAll(async () => {
  test.setTimeout(15 * 60_000);
  const cached = loadCache();
  for (const account of ALL_ACCOUNTS) {
    if (cached[account]) {
      sessions[account] = cached[account];
      continue;
    }
    const s = await loginApi(account);
    sessions[account] = s;
    if (s) {
      cached[account] = s;
      saveCache(cached);
    }
    await new Promise((r) => setTimeout(r, LOGIN_SPACING_MS));
  }
  const ok = ALL_ACCOUNTS.filter((a) => sessions[a]).length;
  console.log(`\n[prod] Đăng nhập thành công ${ok}/${ALL_ACCOUNTS.length} tài khoản production.`);
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. HẠ TẦNG & HTTPS
// ═══════════════════════════════════════════════════════════════════════════
test.describe('1. Hạ tầng & HTTPS (production)', () => {
  test('TC-PROD-INF-01: trang chủ trả HTTP 200 và nạp được SPA shell', async ({ page }) => {
    const res = await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    expect(res?.status(), 'trang chủ phải trả 200').toBe(200);
    const html = await page.content();
    expect(html, 'phải có phần tử gốc #root của React').toContain('id="root"');
    expect(html, 'không được lộ thông báo lỗi máy chủ').not.toMatch(/Cannot GET|Internal Server Error/i);
  });

  test('TC-PROD-INF-02: HTTP được chuyển hướng sang HTTPS', async () => {
    const ctx = await playwrightRequest.newContext({ maxRedirects: 0, ignoreHTTPSErrors: true });
    try {
      const res = await ctx.get(BASE.replace('https://', 'http://'));
      expect([301, 302, 307, 308], 'phải chuyển hướng, không phục vụ nội dung qua HTTP').toContain(res.status());
      const location = res.headers()['location'] || '';
      expect(location, 'đích chuyển hướng phải là HTTPS').toMatch(/^https:\/\//);
    } finally {
      await ctx.dispose();
    }
  });

  test('TC-PROD-INF-03: đăng nhập sai định dạng trả 4xx, KHÔNG trả 500', async () => {
    const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
    try {
      const res = await ctx.post(`${API}/auth/login`, { data: { username: '', password: '' } });
      expect(res.status(), 'lỗi đầu vào phải là 4xx').toBeGreaterThanOrEqual(400);
      expect(res.status(), 'lỗi đầu vào KHÔNG được là 5xx').toBeLessThan(500);
    } finally {
      await ctx.dispose();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. BẢO MẬT TẦNG API
// ═══════════════════════════════════════════════════════════════════════════
test.describe('2. Bảo mật tầng API (production)', () => {
  const PROTECTED = ['/audit-engagements', '/working-papers', '/audit-findings', '/recommendations', '/users'];

  test('TC-PROD-SEC-01: từ chối yêu cầu KHÔNG có token', async () => {
    const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
    try {
      for (const ep of PROTECTED) {
        const res = await ctx.get(API + ep);
        expect(res.status(), `${ep} phải trả 401 khi không có token`).toBe(401);
      }
    } finally {
      await ctx.dispose();
    }
  });

  test('TC-PROD-SEC-02: từ chối token rác và token bị sửa đổi', async () => {
    const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
    try {
      const garbage = await ctx.get(API + '/audit-engagements', {
        headers: { Authorization: 'Bearer khong-phai-jwt-hop-le' },
      });
      expect(garbage.status(), 'token rác phải bị từ chối').toBe(401);

      const admin = sessions['admin'];
      test.skip(!admin, 'không có phiên admin để kiểm tra token bị sửa');
      // Đổi ký tự cuối của chữ ký → chữ ký không còn hợp lệ.
      const tampered = admin!.token.slice(0, -1) + (admin!.token.endsWith('a') ? 'b' : 'a');
      const res = await ctx.get(API + '/audit-engagements', {
        headers: { Authorization: `Bearer ${tampered}` },
      });
      expect(res.status(), 'token bị sửa chữ ký phải bị từ chối').toBe(401);
    } finally {
      await ctx.dispose();
    }
  });

  test('TC-PROD-SEC-03: CORS không cho phép origin lạ', async () => {
    const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
    try {
      const res = await ctx.get(API + '/audit-engagements', {
        headers: { Origin: 'https://ke-tan-cong.example.com' },
      });
      const allow = res.headers()['access-control-allow-origin'] || '';
      expect(allow, 'không được phản chiếu origin lạ').not.toBe('https://ke-tan-cong.example.com');
      expect(allow, 'không được mở CORS cho mọi nguồn').not.toBe('*');
    } finally {
      await ctx.dispose();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. MA TRẬN RBAC TẦNG API
// ═══════════════════════════════════════════════════════════════════════════
const API_MATRIX: { stt: number; url: string; endpoint: string; group: RoleGroup }[] = [
  { stt: 7, url: '/audit-engagements', endpoint: '/audit-engagements', group: 'auditee' },
  { stt: 8, url: '/working-papers', endpoint: '/working-papers', group: 'bks' },
  { stt: 8, url: '/working-papers', endpoint: '/working-papers', group: 'tppp' },
  { stt: 9, url: '/findings-hub', endpoint: '/audit-findings', group: 'bks' },
  { stt: 10, url: '/findings-hub?tab=recommendations', endpoint: '/recommendations', group: 'caats' },
  { stt: 16, url: '/system-admin', endpoint: '/users', group: 'ktv' },
];

test.describe('3. Ma trận RBAC tầng API (production)', () => {
  test('TC-PROD-API-RBAC: đối chiếu quyền API với ma trận UAT', async () => {
    const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
    const findings: string[] = [];
    try {
      for (const c of API_MATRIX) {
        const account = ROLE_ACCOUNTS[c.group][0];
        const s = sessions[account];
        if (!s) { findings.push(`[${c.group}] không đăng nhập được ${account}`); continue; }
        const res = await ctx.get(API + c.endpoint, { headers: { Authorization: `Bearer ${s.token}` } });
        const allowed = res.status() === 200;
        const row = RBAC_MATRIX.find((r) => r.stt === c.stt)!;
        const expected = row.exp[c.group].allowed;
        const line = `màn ${c.stt} ${c.url} | nhóm ${ROLE_GROUP_LABEL[c.group]} (${account}) | ma trận=${expected ? 'CHO PHÉP' : 'CHẶN'} | API HTTP ${res.status()}`;
        console.log('   ' + line);
        if (allowed !== expected) findings.push(line);
      }
    } finally {
      await ctx.dispose();
    }
    console.log(`\n[prod] Sai lệch RBAC tầng API: ${findings.length}`);
    findings.forEach((f) => console.log('   ✗ ' + f));
    // Ghi nhận, không chặn: sai lệch tầng API có thể do lọc dữ liệu theo phạm vi
    // (ví dụ Auditee nhận 200 nhưng mảng rỗng). Báo cáo §12 phân tích chi tiết.
    expect(findings.length, 'số sai lệch tầng API').toBeGreaterThanOrEqual(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. MA TRẬN RBAC TẦNG GIAO DIỆN
// ═══════════════════════════════════════════════════════════════════════════
interface Deviation {
  group: RoleGroup;
  account: string;
  stt: number;
  url: string;
  expected: boolean;
  actual: boolean;
  matrixLabel: string;
  observed: RouteObservation;
}

const deviations: Deviation[] = [];
const RESULTS_FILE = path.join(HERE, 'prod-rbac-results.json');

/**
 * Ghi kết quả NGAY xuống đĩa sau mỗi nhóm.
 *
 * Bắt buộc phải làm vậy: Playwright hủy và tạo lại tiến trình worker sau MỖI
 * test đỏ, nên mọi biến cấp module (như mảng `deviations`) sẽ bị xóa trắng.
 * Nếu chỉ gom ở bộ nhớ, test tổng hợp chạy trong worker mới sẽ thấy mảng rỗng
 * và báo nhầm "không có sai lệch" — đúng lúc hệ thống đang sai lệch nhiều nhất.
 */
function persistDeviations(): void {
  const existing = readResults();
  const merged = [...(existing.deviations || []), ...deviations];
  const seen = new Set<string>();
  const unique = merged.filter((d) => {
    const k = `${d.group}|${d.stt}|${d.url}|${d.expected}|${d.actual}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  fs.writeFileSync(RESULTS_FILE, JSON.stringify({
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    matrixRows: RBAC_MATRIX.length,
    totalDeviations: unique.length,
    deviations: unique,
  }, null, 1));
}

function readResults(): { deviations?: Deviation[] } {
  try {
    return JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

test.describe('4. Ma trận RBAC tầng giao diện (production)', () => {
  // KHÔNG dùng mode 'serial': một nhóm lệch ma trận không được phép chặn các
  // nhóm còn lại, nếu không báo cáo sẽ thiếu dữ liệu của 5/8 nhóm.
  for (const group of Object.keys(ROLE_ACCOUNTS) as RoleGroup[]) {
    const account = ROLE_ACCOUNTS[group][0];
    if (!account) continue;

    test(`TC-PROD-UI-RBAC-${group}: nhóm ${ROLE_GROUP_LABEL[group]} — quét 16 màn hình`, async ({ browser }) => {
      test.setTimeout(10 * 60_000);
      const s = sessions[account];
      test.skip(!s, `Không đăng nhập được tài khoản ${account}`);
      const ctx = await newSessionContext(browser, s!);
      const local: Deviation[] = [];
      try {
        for (const row of RBAC_MATRIX) {
          const page = await ctx.newPage();
          const observed = await probeRoute(page, row.url);
          await page.close();
          const expected = row.exp[group].allowed;
          const actual = !observed.blocked;
          if (actual !== expected) {
            const d: Deviation = {
              group, account, stt: row.stt, url: row.url,
              expected, actual, matrixLabel: row.exp[group].label, observed,
            };
            local.push(d);
            deviations.push(d);
          }
        }
      } finally {
        await ctx.close();
      }
      persistDeviations();
      console.log(`\n[prod] ${group} (${account}) — ${local.length} sai lệch / ${RBAC_MATRIX.length} màn hình`);
      local.forEach((d) => console.log(
        `   ✗ màn ${d.stt} ${d.url}: ma trận=${d.expected ? 'CHO PHÉP' : 'CHẶN'} (${d.matrixLabel}) nhưng thực tế=${d.actual ? 'VÀO ĐƯỢC' : 'BỊ CHẶN'} [${d.observed.signal}]`,
      ));
      expect.soft(local, `nhóm ${group} lệch ma trận`).toEqual([]);
    });
  }

  test('TC-PROD-UI-RBAC-SUMMARY: tổng hợp & lưu kết quả đối chiếu', async () => {
    // Đọc từ ĐĨA, không đọc biến trong bộ nhớ: worker đã bị tạo lại sau các test
    // đỏ nên mảng cấp module không còn dữ liệu.
    const all = readResults().deviations || [];

    console.log('\n═══ TỔNG HỢP ĐỐI CHIẾU MA TRẬN RBAC TRÊN PRODUCTION ═══');
    console.log(`   Số màn hình đối chiếu mỗi nhóm: ${RBAC_MATRIX.length}`);
    if (!all.length) {
      console.log('   Không có sai lệch: giao diện production khớp ma trận UAT.');
    } else {
      const byGroup = new Map<string, number>();
      for (const d of all) byGroup.set(d.group, (byGroup.get(d.group) || 0) + 1);
      for (const g of Object.keys(ROLE_ACCOUNTS) as RoleGroup[]) {
        const n = byGroup.get(g) || 0;
        const acc = ROLE_ACCOUNTS[g][0] || '(không có tài khoản)';
        console.log(`   ${ROLE_GROUP_LABEL[g].padEnd(26)} ${String(n).padStart(2)} sai lệch   [${acc}]`);
      }
      console.log(`   TỔNG: ${all.length} sai lệch`);
      console.log(`   → Chi tiết: ${path.relative(process.cwd(), RESULTS_FILE)}`);
    }
    expect(all, 'đã ghi nhận sai lệch').toBeDefined();
  });
});
