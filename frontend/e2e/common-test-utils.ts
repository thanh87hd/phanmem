import { expect, type Page, type Browser, type BrowserContext } from '@playwright/test';

export const DEFAULT_PASSWORD = process.env.UAT_PW || '@Lpbank2026!';

export interface LoggedInSession {
  context: BrowserContext;
  page: Page;
  serverErrors: string[];
}

/**
 * Đăng nhập an toàn theo vai trò nghiệp vụ với cơ chế retry thông minh khi gặp rate-limit 429
 */
export async function loginAsRole(
  browser: Browser,
  username: string,
  password = DEFAULT_PASSWORD,
): Promise<LoggedInSession> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const serverErrors: string[] = [];

  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('/api/') && res.status() >= 500) {
      serverErrors.push(`${res.status()} ${url.replace(/^https?:\/\/[^/]+/, '')}`);
    }
  });

  const MAX_ATTEMPTS = 4;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await page.goto('/login');
    await page.locator('#login_username').fill(username);
    await page.locator('#login_password').fill(password);
    await page.getByRole('button', { name: /Đăng nhập$/ }).click();

    try {
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
      return { context, page, serverErrors };
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) throw err;
      // Chờ hạ nhiệt rate-limiter 10 req/min
      await page.waitForTimeout(25_000);
    }
  }

  return { context, page, serverErrors };
}

/**
 * Kiểm tra trang điều hướng hoàn tất, không lỗi 5xx và DOM sẵn sàng
 */
export async function assertPageLoadedCleanly(
  page: Page,
  serverErrors: string[],
  route: string,
  expectedPattern?: RegExp,
): Promise<void> {
  await page.goto(route);
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.locator('body')).toBeVisible();

  if (expectedPattern) {
    await expect(page.locator('body')).toContainText(expectedPattern, { timeout: 25_000 });
  }

  expect(serverErrors, `Phát hiện lỗi HTTP 5xx tại route ${route}:\n` + serverErrors.join('\n')).toEqual([]);
}
