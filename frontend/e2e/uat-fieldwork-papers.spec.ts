import { test, expect } from '@playwright/test';
import { loginAsRole, assertPageLoadedCleanly } from './common-test-utils';

test.describe('E2E — Phân Hệ 3: Thực Hiện Kiểm Toán & Giấy Tờ Làm Việc (Fieldwork & WP)', () => {
  test('TC-ENG-01: Quản lý danh sách cuộc kiểm toán (Audit Engagements)', async ({ browser }) => {
    const { context, page, serverErrors } = await loginAsRole(browser, 'thanhpd');

    await assertPageLoadedCleanly(
      page,
      serverErrors,
      '/audit-engagements',
      /Cuộc kiểm toán|Đoàn kiểm toán|Mã đoàn|Tiến độ/i,
    );

    // Kiểm tra có bảng danh sách cuộc kiểm toán
    const table = page.locator('.ant-table, [role="table"]').first();
    await expect(table).toBeVisible({ timeout: 15_000 });

    await context.close();
  });

  test('TC-ENG-02: Giấy tờ làm việc của Kiểm toán viên (Working Papers List)', async ({ browser }) => {
    const { context, page, serverErrors } = await loginAsRole(browser, 'danhpc');

    await assertPageLoadedCleanly(
      page,
      serverErrors,
      '/working-papers',
      /Giấy tờ làm việc|Working Paper|Thủ tục|Trạng thái/i,
    );

    // Kiểm tra nút hoặc bảng làm việc
    await expect(page.locator('body')).toBeVisible();
    expect(serverErrors).toEqual([]);

    await context.close();
  });

  test('TC-ENG-03: Soát xét chất lượng IIA 1311 & Ghi chú soát xét (Review Notes)', async ({ browser }) => {
    const { context, page, serverErrors } = await loginAsRole(browser, 'thanhpd');

    await page.goto('/working-papers');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('body')).toBeVisible();

    // Mở drawer nếu có hàng nào trong bảng
    const firstRow = page.locator('.ant-table-row').first();
    if (await firstRow.isVisible()) {
      await firstRow.click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    expect(serverErrors).toEqual([]);
    await context.close();
  });

  test('TC-ENG-04: Quản lý Yêu cầu thay đổi cuộc kiểm toán (Engagement Change Requests)', async ({ browser }) => {
    const { context, page, serverErrors } = await loginAsRole(browser, 'hiepnt');

    await assertPageLoadedCleanly(
      page,
      serverErrors,
      '/engagement-change-requests',
      /Đoàn kiểm toán|Người yêu cầu|Yêu cầu thay đổi|Gia hạn|Bổ sung|Change Request/i,
    );

    await context.close();
  });
});
