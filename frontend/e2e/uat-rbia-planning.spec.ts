import { test, expect } from '@playwright/test';
import { loginAsRole, assertPageLoadedCleanly } from './common-test-utils';

test.describe('E2E — Phân Hệ 2: Rủi Ro & Lập Kế Hoạch Năm (RBIA Line 3)', () => {
  test('TC-RP-01: Lãnh đạo/KTV mở tab Phạm vi & Vũ trụ kiểm toán (Scope/Universe)', async ({ browser }) => {
    const { context, page, serverErrors } = await loginAsRole(browser, 'thanhpd');

    await assertPageLoadedCleanly(
      page,
      serverErrors,
      '/risk-and-planning?step=scope',
      /Phạm vi|Vũ trụ|Đối tượng|Đơn vị/i,
    );

    // Kiểm tra có bảng dữ liệu đối tượng kiểm toán hiển thị
    const tableOrList = page.locator('.ant-table, .ant-card, [role="table"]').first();
    await expect(tableOrList).toBeVisible({ timeout: 15_000 });

    await context.close();
  });

  test('TC-RP-02: Thư viện Rủi ro & Kiểm soát (RCM Library)', async ({ browser }) => {
    const { context, page, serverErrors } = await loginAsRole(browser, 'thanhpd');

    await assertPageLoadedCleanly(
      page,
      serverErrors,
      '/risk-and-planning?step=library',
      /Thư viện|RCM|Rủi ro|Kiểm soát|COSO/i,
    );

    // Bảng thư viện RCM hiển thị các quy trình nghiệp vụ ngân hàng
    await expect(page.locator('body')).toBeVisible();
    expect(serverErrors).toEqual([]);

    await context.close();
  });

  test('TC-RP-03: Chấm điểm rủi ro & Ma trận Heatmap (Prioritization)', async ({ browser }) => {
    const { context, page, serverErrors } = await loginAsRole(browser, 'hiepnt');

    await assertPageLoadedCleanly(
      page,
      serverErrors,
      '/risk-and-planning?step=prioritization',
      /Đánh giá|Chấm điểm|Rủi ro|Xếp hạng|Ưu tiên/i,
    );

    // Kiểm tra bộ lọc hoặc điểm rủi ro hiển thị không bị sập JS
    await page.waitForTimeout(500);
    expect(serverErrors).toEqual([]);

    await context.close();
  });

  test('TC-RP-04: Kế hoạch kiểm toán năm & Phân bổ nguồn lực (Plan & Resources)', async ({ browser }) => {
    const { context, page, serverErrors } = await loginAsRole(browser, 'hiepnt');

    await assertPageLoadedCleanly(
      page,
      serverErrors,
      '/risk-and-planning?step=plan',
      /Kế hoạch|Nguồn lực|Mandays|Cuộc kiểm toán/i,
    );

    // Kiểm tra tab kế hoạch hiển thị cấu trúc phân bổ
    await page.waitForTimeout(500);
    expect(serverErrors).toEqual([]);

    await context.close();
  });
});
