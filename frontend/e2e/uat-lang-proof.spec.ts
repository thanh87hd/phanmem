import { test, expect, type Browser } from '@playwright/test';
const PW = process.env.UAT_PW || '@Lpbank2026!';

/**
 * CHỨNG MINH LỖI: quyền truy cập phụ thuộc NGÔN NGỮ TRÌNH DUYỆT.
 *
 * ProtectedRoute so khớp vai trò bằng chuỗi ĐÃ DỊCH qua i18n t(), trong khi
 * vai trò lưu trong DB luôn là tiếng Việt ("Kiểm toán viên chính").
 *   - Trình duyệt tiếng Việt -> t() trả "kiểm toán viên" -> KHỚP  -> OK
 *   - Trình duyệt tiếng Anh  -> t() trả "auditor"        -> KHÔNG -> 403
 * Cùng một tài khoản, cùng một dữ liệu. Đây là lỗi phân quyền thật.
 */
async function check(browser: Browser, locale: string, user: string) {
  const ctx = await browser.newContext({ locale });
  const page = await ctx.newPage();
  await page.goto('/login');
  await page.locator('#login_username').fill(user);
  await page.locator('#login_password').fill(PW);
  await page.getByRole('button', { name: /Đăng nhập$/ }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
  const lang = await page.evaluate(() => localStorage.getItem('i18nextLng'));
  await page.goto('/findings-hub?tab=findings');
  await page.waitForTimeout(3000);
  const forbidden = await page.locator('text=403 Forbidden').count();
  const role = await page.evaluate(() => JSON.parse(localStorage.getItem('user') || '{}')?.role);
  await ctx.close();
  return { lang, forbidden: forbidden > 0, role };
}

test('CÙNG tài khoản KTV: tiếng Việt vào được, tiếng Anh bị 403 (LỖI)', async ({ browser }) => {
  const vi = await check(browser, 'vi-VN', 'danhpc');
  console.log('[vi-VN] i18nextLng=' + vi.lang + ' | role=' + vi.role + ' | 403? ' + vi.forbidden);
  const en = await check(browser, 'en-US', 'danhpc');
  console.log('[en-US] i18nextLng=' + en.lang + ' | role=' + en.role + ' | 403? ' + en.forbidden);
  console.log('');
  console.log('KET LUAN: phu thuoc ngon ngu = ' + (vi.forbidden !== en.forbidden));

  // Tiêu chí đúng: quyền truy cập KHÔNG được phụ thuộc ngôn ngữ.
  expect(vi.forbidden, 'Tiếng Việt: KTV phải vào được').toBe(false);
  expect(en.forbidden, 'Tiếng Anh: KTV cũng phải vào được — đây là lỗi cần sửa').toBe(false);
});
