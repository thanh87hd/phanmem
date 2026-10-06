import { test, expect } from '@playwright/test';
import { loginAsRole, assertPageLoadedCleanly } from './common-test-utils';

test.describe('E2E — Phân Hệ 4: Phát Hiện 5C, Kiến Nghị & Báo Cáo KT (Findings & Reports)', () => {
  test('TC-FIND-01: Trung tâm phát hiện 5C (Audit Findings Center)', async ({ browser }) => {
    const { context, page, serverErrors } = await loginAsRole(browser, 'danhpc');

    await assertPageLoadedCleanly(
      page,
      serverErrors,
      '/findings-hub?tab=findings',
      /Phát hiện|5C|Danh sách|Mức độ/i,
    );

    const findingTable = page.locator('.ant-table, [role="table"]').first();
    await expect(findingTable).toBeVisible({ timeout: 15_000 });

    await context.close();
  });

  test('TC-FIND-02: Phân tích phát hiện kiểm toán (Findings Analytics)', async ({ browser }) => {
    const { context, page, serverErrors } = await loginAsRole(browser, 'thanhpd');

    await assertPageLoadedCleanly(
      page,
      serverErrors,
      '/findings-hub?tab=findings&subTab=sub2',
      /Phân tích|Biểu đồ|Thống kê|Xu hướng/i,
    );

    expect(serverErrors).toEqual([]);
    await context.close();
  });

  test('TC-FIND-03: Báo cáo kiểm toán & Xếp hạng KSNB A/B/C/D (Audit Reports & Ratings)', async ({ browser }) => {
    const { context, page, serverErrors } = await loginAsRole(browser, 'hiepnt');

    await assertPageLoadedCleanly(
      page,
      serverErrors,
      '/findings-hub?tab=reports',
      /Báo cáo|Xếp hạng|Phát hành|Dự thảo/i,
    );

    expect(serverErrors).toEqual([]);
    await context.close();
  });

  test('TC-FIND-04: Theo dõi Kiến nghị & SLA Trễ hạn (Recommendations & SLA Tracking)', async ({ browser }) => {
    const { context, page, serverErrors } = await loginAsRole(browser, 'danhpc');

    await assertPageLoadedCleanly(
      page,
      serverErrors,
      '/findings-hub?tab=recommendations',
      /Kiến nghị|SLA|Hạn hoàn thành|Trạng thái/i,
    );

    const recTable = page.locator('.ant-table, [role="table"]').first();
    await expect(recTable).toBeVisible({ timeout: 15_000 });

    await context.close();
  });
});
