import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Đăng nhập một lần và lưu phiên (storage state) cho project `chromium`.
 *
 * Lưu ý: các bài kiểm thử UAT trong `uat-smoke.spec.ts` tự đăng nhập theo TỪNG
 * vai trò nên không phụ thuộc phiên của file này; file này chỉ để project
 * `chromium` (khai báo `dependencies: ['setup']`) có thể khởi động.
 */
// Dự án dùng ESM nên KHÔNG có __dirname — suy ra từ import.meta.url.
const here = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(here, '..', 'playwright', '.auth');
const authFile = path.join(authDir, 'user.json');

setup('đăng nhập và lưu phiên làm việc', async ({ page }) => {
  const username = process.env.UAT_USER || 'admin';
  const password = process.env.UAT_PW || '@Lpbank2026!';

  await page.goto('/login');
  await page.locator('#login_username').fill(username);
  await page.locator('#login_password').fill(password);
  await page.getByRole('button', { name: /Đăng nhập$/ }).click();

  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });

  fs.mkdirSync(authDir, { recursive: true });
  await page.context().storageState({ path: authFile });
});
