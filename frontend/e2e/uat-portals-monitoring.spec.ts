import { test, expect } from '@playwright/test';
import { loginAsRole, assertPageLoadedCleanly } from './common-test-utils';

test.describe('E2E — Phân Hệ 5: Cổng Chuyên Biệt, Giám Sát KRI & BSC-KPI (Portals & Monitoring)', () => {
  test('TC-PORT-01: Cổng Ban Kiểm Soát & Giám sát IIA 1000 (Audit Committee Portal)', async ({ browser }) => {
    const { context, page, serverErrors } = await loginAsRole(browser, 'bks.chair');

    await assertPageLoadedCleanly(
      page,
      serverErrors,
      '/audit-committee-portal',
      /Ban kiểm soát|Ủy ban kiểm toán|Điều lệ|Tuyến bảo vệ/i,
    );

    expect(serverErrors).toEqual([]);
    await context.close();
  });

  test('TC-PORT-02: Giám sát đoàn thanh tra / kiểm tra ngoài NHNN (Regulatory Exams)', async ({ browser }) => {
    const { context, page, serverErrors } = await loginAsRole(browser, 'bks.chair');

    await assertPageLoadedCleanly(
      page,
      serverErrors,
      '/regulatory-exams',
      /Thanh tra|NHNN|Kiểm toán Nhà nước|Đoàn/i,
    );

    expect(serverErrors).toEqual([]);
    await context.close();
  });

  test('TC-PORT-03: Cổng Đơn vị được kiểm toán (Auditee Portal)', async ({ browser }) => {
    const { context, page, serverErrors } = await loginAsRole(browser, 'hiepnt');

    await assertPageLoadedCleanly(
      page,
      serverErrors,
      '/auditee-portal',
      /Cổng đơn vị|Kiến nghị|Giải trình|Khắc phục/i,
    );

    expect(serverErrors).toEqual([]);
    await context.close();
  });

  test('TC-PORT-04: Giám sát liên tục & KRI Cảnh báo sớm (Continuous Monitoring & KRI)', async ({ browser }) => {
    const { context, page, serverErrors } = await loginAsRole(browser, 'thanhpd');

    await assertPageLoadedCleanly(
      page,
      serverErrors,
      '/continuous-monitoring',
      /Giám sát liên tục|KRI|Cảnh báo|Chỉ số/i,
    );

    expect(serverErrors).toEqual([]);
    await context.close();
  });

  test('TC-PORT-05: Việc ngoài đoàn (General Tasks) & BSC-KPI Nhân sự', async ({ browser }) => {
    const { context, page, serverErrors } = await loginAsRole(browser, 'danhpc');

    await assertPageLoadedCleanly(
      page,
      serverErrors,
      '/general-tasks',
      /Việc ngoài đoàn|Công việc|Tiến độ|Nhiệm vụ/i,
    );

    await assertPageLoadedCleanly(
      page,
      serverErrors,
      '/bsc-kpi',
      /BSC|KPI|Đánh giá|Hiệu suất/i,
    );

    await context.close();
  });
});
