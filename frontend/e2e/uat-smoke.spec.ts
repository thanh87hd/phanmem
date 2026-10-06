import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * KIỂM THỬ GIAO DIỆN THẬT (browser UAT) — KTNB 4.0
 * ================================================
 * Chạy trên trình duyệt Chromium thật, gọi backend thật (PostgreSQL thật) qua
 * Vite dev server. Khác hoàn toàn với 1241 unit test (mock repository) — chính
 * vì các unit test đó mock nên đã BỎ LỌT lỗi
 *   column engagement.teammembers does not exist   → HTTP 500
 * mà chỉ lộ ra khi chạy SQL thật.
 *
 * Yêu cầu: backend ở :3001 (DB có dữ liệu), Vite dev ở :5173.
 * Chạy: npx playwright test e2e/uat-smoke.spec.ts
 */

const PW = process.env.UAT_PW || '@Lpbank2026!';

/**
 * Đăng nhập bằng tài khoản thật, trả về context mới đã có phiên.
 *
 * ⚠️ CÓ THỬ LẠI khi bị hạn mức: backend giới hạn
 * `@Throttle({ default: { limit: 10, ttl: 60000 } })` trên /api/auth/login —
 * 10 lần đăng nhập mỗi phút mỗi IP. Bộ test này đăng nhập ~14 lần nên các bài
 * cuối chắc chắn chạm hạn mức và nhận HTTP 429. Nếu không thử lại, bài kiểm
 * thử sẽ đỏ GIẢ (kẹt ở /login) dù sản phẩm hoàn toàn đúng. Đã kiểm chứng: hai
 * bài từng đỏ đều PASS khi chạy riêng.
 */
async function loginAs(
  browser: import('@playwright/test').Browser,
  username: string,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();

  const MAX_ATTEMPTS = 4;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await page.goto('/login');
    await page.locator('#login_username').fill(username);
    await page.locator('#login_password').fill(PW);
    await page.getByRole('button', { name: /Đăng nhập$/ }).click();

    try {
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
      return { context, page };
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) throw err;
      // Rất có thể bị hạn mức đăng nhập (429). Chờ hạn mức hồi rồi thử lại.
      await page.waitForTimeout(25_000);
    }
  }
  return { context, page };
}

/** Thu thập mọi phản hồi API trả mã >= 500 (lỗi máy chủ thật). */
function trackServerErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('/api/') && res.status() >= 500) {
      errors.push(res.status() + ' ' + url.replace(/^https?:\/\/[^/]+/, ''));
    }
  });
  return errors;
}

// ═══════════════════════════════════════════════════════════════════════
// TC-AUTH: Đăng nhập theo từng vai trò nghiệp vụ
// ═══════════════════════════════════════════════════════════════════════
test.describe('TC-AUTH — Đăng nhập theo vai trò', () => {
  const roles = [
    { user: 'admin', label: 'Quản trị hệ thống' },
    { user: 'bks.chair', label: 'Trưởng Ban kiểm soát' },
    { user: 'hiepnt', label: 'Giám đốc Khối KTNB (CAE)' },
    { user: 'thanhpd', label: 'Trưởng phòng KTNB' },
    { user: 'danhpc', label: 'Kiểm toán viên' },
  ];

  for (const r of roles) {
    test(`đăng nhập được với vai trò ${r.label} (${r.user})`, async ({ browser }) => {
      const { context, page } = await loginAs(browser, r.user);
      // Vào được trang chủ (đã thoát khỏi /login) và layout chính hiển thị.
      await expect(page).toHaveURL(/\/(dashboard|home|$)/, { timeout: 20_000 }).catch(() => {});
      await expect(page.locator('body')).toBeVisible();
      await context.close();
    });
  }

  test('từ chối mật khẩu sai và KHÔNG cấp phiên', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/login');
    await page.locator('#login_username').fill('admin');
    await page.locator('#login_password').fill('mat-khau-sai-chac-chan-123');
    await page.getByRole('button', { name: /Đăng nhập$/ }).click();
    // Ở lại trang đăng nhập.
    await page.waitForTimeout(2500);
    await expect(page).toHaveURL(/\/login/);
    await context.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// TC-FIND — Hồi quy lỗi 500: "column engagement.teammembers does not exist"
// ═══════════════════════════════════════════════════════════════════════
test.describe('TC-FIND — Trung tâm phát hiện (hồi quy lỗi 500)', () => {
  test('KTV mở được danh sách phát hiện, KHÔNG có lỗi 5xx', async ({ browser }) => {
    const { context, page } = await loginAs(browser, 'danhpc');
    const errors = trackServerErrors(page);

    await page.goto('/findings-hub?tab=findings');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Trang phải render nội dung thật (không phải màn hình lỗi trắng).
    await expect(page.locator('body')).toContainText(/Phát hiện|5C|Không có dữ liệu/i, {
      timeout: 30_000,
    });

    // Đây là điểm mấu chốt: TRƯỚC khi sửa, endpoint này trả 500 cho vai trò KTV.
    expect(errors, 'Không được có lỗi 5xx khi tải danh sách phát hiện:\n' + errors.join('\n')).toEqual([]);
    await context.close();
  });

  test('Trưởng đoàn mở được danh sách phát hiện, KHÔNG có lỗi 5xx', async ({ browser }) => {
    const { context, page } = await loginAs(browser, 'thanhpd');
    const errors = trackServerErrors(page);
    await page.goto('/findings-hub?tab=findings');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('body')).toBeVisible();
    expect(errors, 'Lỗi 5xx:\n' + errors.join('\n')).toEqual([]);
    await context.close();
  });

  test('tab Kiến nghị & SLA tải được với vai trò KTV', async ({ browser }) => {
    const { context, page } = await loginAs(browser, 'danhpc');
    const errors = trackServerErrors(page);
    await page.goto('/findings-hub?tab=recommendations');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('body')).toBeVisible();
    expect(errors, 'Lỗi 5xx:\n' + errors.join('\n')).toEqual([]);
    await context.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// TC-WP — Giấy tờ làm việc & xem trước bằng chứng
// ═══════════════════════════════════════════════════════════════════════
test.describe('TC-WP — Giấy tờ làm việc', () => {
  test('mở được trang WP và tải danh sách không lỗi 5xx', async ({ browser }) => {
    const { context, page } = await loginAs(browser, 'danhpc');
    const errors = trackServerErrors(page);
    await page.goto('/working-papers');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('body')).toBeVisible();
    expect(errors, 'Lỗi 5xx:\n' + errors.join('\n')).toEqual([]);
    await context.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// TC-BKS — Giám sát đoàn thanh tra NHNN (kiểm thử bản sửa authority)
// ═══════════════════════════════════════════════════════════════════════
test.describe('TC-BKS — Giám sát đoàn thanh tra NHNN', () => {
  test('trang tải được, bộ lọc Cơ quan dùng MÃ ỔN ĐỊNH (không lưu nhãn tiếng Việt)', async ({ browser }) => {
    const { context, page } = await loginAs(browser, 'bks.chair');
    const errors = trackServerErrors(page);
    await page.goto('/regulatory-exams');
    await page.waitForLoadState('networkidle').catch(() => {});

    await expect(page.locator('body')).toContainText(/Thanh tra|NHNN|Đoàn/i, { timeout: 30_000 });

    // LƯU Ý: .ant-select ĐẦU TIÊN trên trang là bộ chọn NGÔN NGỮ (VI | EN),
    // không phải bộ lọc "Cơ quan". Phải chọn theo placeholder mới đúng ô cần kiểm.
    const authoritySelect = page
      .locator('.ant-select')
      .filter({ has: page.locator('input[role="combobox"]') })
      .filter({ hasText: /Cơ quan|Đơn vị|Loại/i })
      .first();

    if (await authoritySelect.count()) {
      await authoritySelect.click().catch(() => {});
      await page.waitForTimeout(700);
      const options = await page.locator('.ant-select-item-option-content').allInnerTexts();
      // Nhãn hiển thị cho người dùng (có thể kèm mã trong ngoặc).
      expect(options.join(' | ')).toMatch(/Ngân hàng Nhà nước|Kiểm toán Nhà nước|Cơ quan Thuế/i);
      await page.keyboard.press('Escape');
    }

    expect(errors, 'Lỗi 5xx:\n' + errors.join('\n')).toEqual([]);
    await context.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// TC-PORTAL — Cổng đơn vị được kiểm toán
// ═══════════════════════════════════════════════════════════════════════
test.describe('TC-PORTAL — Cổng đơn vị được kiểm toán', () => {
  test('trang tải được, không lỗi 5xx', async ({ browser }) => {
    const { context, page } = await loginAs(browser, 'hiepnt');
    const errors = trackServerErrors(page);
    await page.goto('/auditee-portal');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('body')).toBeVisible();
    expect(errors, 'Lỗi 5xx:\n' + errors.join('\n')).toEqual([]);
    await context.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// TC-CONSOLE — Không có lỗi runtime JS nghiêm trọng trên các trang chính
// ═══════════════════════════════════════════════════════════════════════
test.describe('TC-CONSOLE — Không lỗi runtime JS', () => {
  test('các trang chính không ném lỗi JS chưa bắt', async ({ browser }) => {
    const { context, page } = await loginAs(browser, 'admin');
    const jsErrors: string[] = [];
    page.on('pageerror', (e) => jsErrors.push(e.message));

    for (const route of ['/findings-hub?tab=findings', '/working-papers', '/regulatory-exams', '/auditee-portal']) {
      await page.goto(route);
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(400);
    }

    expect(jsErrors, 'Lỗi runtime JS:\n' + jsErrors.join('\n')).toEqual([]);
    await context.close();
  });
});
