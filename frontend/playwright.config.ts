/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['list'], ['html', { open: 'never' }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    // Setup project for authentication
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    {
      name: 'chromium',
      // Bộ test production (e2e/prod/**) chạy trên hệ thống THẬT nên tuyệt đối
      // không được lẫn vào lần chạy local này.
      testIgnore: /prod[\\/].*\.spec\.ts/,
      use: { 
        ...devices['Desktop Chrome'],
        // Use the saved storage state for authenticating requests
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // ── Dự án UAT: kiểm thử giao diện thật theo TỪNG VAI TRÒ ──────────────
    // Mỗi bài tự đăng nhập nên KHÔNG dùng storageState của 'setup'.
    // workers: 1 là BẮT BUỘC, không phải để chạy nhanh/chậm:
    // backend giới hạn @Throttle({ limit: 10, ttl: 60000 }) trên /api/auth/login
    // (10 lần đăng nhập mỗi phút mỗi IP). Chạy song song sẽ khiến các bài từ
    // thứ 11 trở đi nhận HTTP 429 và "kẹt" ở trang /login — đỏ giả, không phải
    // lỗi sản phẩm. Đây chính là điều đã xảy ra ở lần chạy đầu (9 passed,
    // 5 failed, tất cả đều dừng tại bước đăng nhập).
    {
      name: 'uat',
      testMatch: /uat-.*\.spec\.ts/,
      fullyParallel: false,
      workers: 1,
      // Hạn mức đăng nhập của backend là 10 lần/phút/IP, mà bộ test này đăng
      // nhập ~14 lần, nên các bài cuối PHẢI chờ hạn mức hồi rồi thử lại
      // (xem loginAs trong uat-smoke.spec.ts). Timeout mặc định 30s không đủ
      // cho một lần chờ hạn mức, nên phải nâng lên 180s.
      timeout: 180_000,
      use: { ...devices['Desktop Chrome'] },
    },

    // ── Dự án PRODUCTION: kiểm chứng trên hệ thống THẬT ktnb.io.vn ─────────
    // KHÁC BIỆT CĂN BẢN so với 'uat': không khởi động webServer, trỏ thẳng vào
    // tên miền thật, và CHỈ ĐỌC (xem đầu tệp prod-verify.spec.ts).
    // workers: 1 là bắt buộc — backend giới hạn 10 lần đăng nhập/phút/IP, mà
    // bộ test này đăng nhập 14 tài khoản.
    // Chạy:  npx playwright test --project=prod
    {
      name: 'prod',
      testDir: './e2e/prod',
      testMatch: /prod-.*\.spec\.ts/,
      fullyParallel: false,
      workers: 1,
      timeout: 600_000,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.PROD_BASE_URL || 'https://ktnb.io.vn',
        ignoreHTTPSErrors: true,
      },
    },
  ],

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  // outputDir: 'test-results/',

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:5173',
  //   reuseExistingServer: !process.env.CI,
  // },
});
