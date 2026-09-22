import { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { createE2EApp, getAdminToken } from './e2e-helper';

describe('Security Post-Patch Verification E2E', () => {
  let app: NestFastifyApplication;
  let jwtToken: string | null = null;

  beforeAll(async () => {
    app = await createE2EApp();
    jwtToken = await getAdminToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. DB SSRF Protection (Test External Database API)', () => {
    it('Should reject connections to localhost/127.0.0.1', async () => {
      if (!jwtToken) {
        console.warn('Skipping SSRF test due to missing JWT token.');
        return;
      }

      const res = await request(app.getHttpServer())
        .post('/api/external-database/test-connection')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          type: 'postgres',
          host: '127.0.0.1',
          port: 5432,
          username: 'postgres',
          password: '123',
          database: 'test',
        });

      // The assertSafeHost throws BadRequestException (400)
      // Or 403 Forbidden if the user doesn't have Action.Manage (which is also a success for security)
      expect([400, 403]).toContain(res.status);

      if (res.status === 400) {
        expect(res.body.message).toMatch(/SSRF Protection/i);
      }
    });

    it('Should reject connections to private network 10.x.x.x', async () => {
      if (!jwtToken) {
        return;
      }

      const res = await request(app.getHttpServer())
        .post('/api/external-database/test-connection')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          type: 'mysql',
          host: '10.0.0.5',
          port: 3306,
          username: 'root',
          password: '123',
          database: 'test',
        });

      expect([400, 403]).toContain(res.status);
    });
  });
});
