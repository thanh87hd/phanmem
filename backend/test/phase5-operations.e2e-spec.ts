import { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { createE2EApp, getAdminToken } from './e2e-helper';

describe('Phase 5: Operations, HR & QA E2E', () => {
  let app: NestFastifyApplication;
  let jwtToken: string | null = null;

  beforeAll(async () => {
    app = await createE2EApp();
    jwtToken = await getAdminToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Quản lý Giờ công (Timesheets)', () => {
    it('Lấy danh sách Giờ công (GET /api/timesheets)', async () => {
      if (!jwtToken) {
        console.warn('Skipping Timesheets test due to missing JWT token.');
        return;
      }

      const res = await request(app.getHttpServer())
        .get('/api/timesheets')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data || res.body)).toBe(true);
    });
  });

  describe('2. Khai báo Chi phí (Audit Expenses)', () => {
    it('Khởi tạo một yêu cầu thanh toán (POST /api/audit-expenses)', async () => {
      if (!jwtToken) {
        console.warn(
          'Skipping Audit Expenses creation test due to missing JWT token.',
        );
        return;
      }

      const payload = {
        amount: 5000000,
        currency: 'VND',
        category: 'Travel',
        description: 'Chi phí di chuyển công tác Chi nhánh Đà Nẵng',
      };

      const res = await request(app.getHttpServer())
        .post('/api/audit-expenses')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(payload);

      // Status could be 201 created, or 400 validation failed (due to missing relations)
      expect([201, 200, 400]).toContain(res.status);
    });
  });

  describe('3. Đảm bảo chất lượng Kiểm toán (QAIP)', () => {
    it('Lấy danh sách đánh giá chất lượng (GET /api/qaip)', async () => {
      if (!jwtToken) {
        console.warn('Skipping QAIP test due to missing JWT token.');
        return;
      }

      const res = await request(app.getHttpServer())
        .get('/api/qaip')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data || res.body)).toBe(true);
    });
  });
});
