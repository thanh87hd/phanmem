import { test, expect } from '@playwright/test';
import { loginAsRole, assertPageLoadedCleanly } from './common-test-utils';

test.describe('E2E — Phân Hệ 6: Quản Trị Hệ Thống, Bảo Mật CASL & Audit Trail', () => {
  test('TC-ADM-01: Quản trị vai trò & Phân quyền CASL (Roles & Permissions)', async ({ browser }) => {
    const { context, page, serverErrors } = await loginAsRole(browser, 'admin');

    await assertPageLoadedCleanly(
      page,
      serverErrors,
      '/system-admin?tab=roles',
      /Vai trò|Quyền hạn|Phân quyền|Quản trị/i,
    );

    const rolesTable = page.locator('.ant-table, [role="table"]').first();
    await expect(rolesTable).toBeVisible({ timeout: 15_000 });

    await context.close();
  });

  test('TC-ADM-02: Quản lý Hồ sơ nhân sự KTV (Personnel Directory)', async ({ browser }) => {
    const { context, page, serverErrors } = await loginAsRole(browser, 'admin');

    await assertPageLoadedCleanly(
      page,
      serverErrors,
      '/system-admin?tab=personnel',
      /Nhân sự|Kiểm toán viên|Phòng ban|Chức danh/i,
    );

    expect(serverErrors).toEqual([]);
    await context.close();
  });

  test('TC-ADM-03: Nhật ký kiểm toán hệ thống (Audit Trail SHA-256)', async ({ browser }) => {
    const { context, page, serverErrors } = await loginAsRole(browser, 'admin');

    await assertPageLoadedCleanly(
      page,
      serverErrors,
      '/system-admin?tab=audit-trail',
      /Nhật ký|Audit Trail|Hành động|Thời gian/i,
    );

    const logTable = page.locator('.ant-table, [role="table"]').first();
    await expect(logTable).toBeVisible({ timeout: 15_000 });

    await context.close();
  });

  test('TC-ADM-04: Bảo mật RBAC: Chặn KTV truy cập cấu hình Quản trị Phương pháp luận & Tham số', async ({ browser }) => {
    const { context, page } = await loginAsRole(browser, 'danhpc');

    await page.goto('/methodology');
    await page.waitForLoadState('networkidle').catch(() => {});

    // KTV không có quyền vào /methodology nên phải thấy 403 Forbidden
    await expect(page.locator('body')).toContainText(/403|Forbidden|không có quyền/i, {
      timeout: 20_000,
    });

    await context.close();
  });
});
