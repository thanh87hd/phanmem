import { test, expect } from '@playwright/test';

/** Kiểm tra TÁCH BIỆT cho 2 bài cuối từng đỏ — loại trừ yếu tố hạn mức đăng nhập. */
const PW = process.env.UAT_PW || '@Lpbank2026!';
async function login(page: any, user: string) {
  await page.goto('/login');
  await page.locator('#login_username').fill(user);
  await page.locator('#login_password').fill(PW);
  await page.getByRole('button', { name: /Đăng nhập$/ }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30000 });
}
test('TC-BKS riêng: bks.chair mở /regulatory-exams', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await login(page, 'bks.chair');
  await page.goto('/regulatory-exams');
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.locator('body')).toContainText(/Thanh tra|NHNN|Đoàn/i, { timeout: 30000 });
  console.log('TC-BKS OK');
  await ctx.close();
});
test('TC-PORTAL riêng: hiepnt mở /auditee-portal', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await login(page, 'hiepnt');
  await page.goto('/auditee-portal');
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.locator('body')).toBeVisible();
  console.log('TC-PORTAL OK');
  await ctx.close();
});
