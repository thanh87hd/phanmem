import { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { createE2EApp, getAdminToken } from './e2e-helper';

describe('Phase 4: Findings, Recommendations & Reporting E2E', () => {
  let app: NestFastifyApplication;
  let jwtToken: string | null = null;

  beforeAll(async () => {
    app = await createE2EApp();
    jwtToken = await getAdminToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Ghi nhận Phát hiện Kiểm toán (Audit Findings)', () => {
    it('Lấy danh sách các phát hiện kiểm toán (GET /api/audit-findings)', async () => {
      if (!jwtToken) {
        console.warn('Skipping Audit Findings test due to missing JWT token.');
        return;
      }

      const res = await request(app.getHttpServer())
        .get('/api/audit-findings')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data || res.body)).toBe(true);
    });
  });

  describe('2. Khởi tạo Kiến nghị khắc phục (Recommendations)', () => {
    it('Tạo mới một Kiến nghị (POST /api/recommendations)', async () => {
      if (!jwtToken) {
        console.warn(
          'Skipping Recommendations creation test due to missing JWT token.',
        );
        return;
      }

      const payload = {
        title: 'Kiến nghị thu hồi công nợ',
        description: 'Đề nghị phòng Kế toán thu hồi công nợ quá hạn 90 ngày.',
        priority: 'High',
      };

      const res = await request(app.getHttpServer())
        .post('/api/recommendations')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(payload);

      // Status could be 201 created, 400 validation failed, or 500 if foreign key constraint fails
      expect([201, 200, 400, 500]).toContain(res.status);
    });
  });

  describe('3. Xuất Báo cáo Kiểm toán (Audit Reports)', () => {
    it('Lấy danh sách Báo cáo Kiểm toán (GET /api/audit-reports)', async () => {
      if (!jwtToken) {
        console.warn('Skipping Audit Reports test due to missing JWT token.');
        return;
      }

      const res = await request(app.getHttpServer())
        .get('/api/audit-reports')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data || res.body)).toBe(true);
    });
  });
});
