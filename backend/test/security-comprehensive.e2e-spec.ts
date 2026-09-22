import { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { createE2EApp } from './e2e-helper';

describe('Smart Audit Comprehensive Security Suite E2E', () => {
  let app: NestFastifyApplication;
  let adminToken: string | null = null;
  let auditorToken: string | null = null;

  beforeAll(async () => {
    app = await createE2EApp();

    // 1. Authenticate Admin
    const resAdmin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'binhtt12', password: '@bcd1234' });

    if (resAdmin.status === 200 || resAdmin.status === 201) {
      adminToken = resAdmin.body.access_token || resAdmin.body.token;
    } else {
      const fallback = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'admin', password: '@bcd1234' });
      if (fallback.status === 200 || fallback.status === 201) {
        adminToken = fallback.body.access_token || fallback.body.token;
      }
    }

    // 2. Authenticate Auditor
    const resAuditor = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'oanhdtk4', password: '@bcd1234' });

    if (resAuditor.status === 200 || resAuditor.status === 201) {
      auditorToken = resAuditor.body.access_token || resAuditor.body.token;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Authentication & Token Tampering (OWASP A07)', () => {
    it('Should reject login with bad credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'fake_user_test', password: 'wrong_password' });

      expect([400, 401]).toContain(res.status);
    });

    it('Should reject forged JWT token with invalid signature', async () => {
      const forgedToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJBZG1pbiJ9.invalid_signature_hash';
      const res = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect([401, 403]).toContain(res.status);
    });

    it('Should reject alg=none JWT attack', async () => {
      const algNoneToken =
        'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IlN1cGVyQWRtaW4ifQ.';
      const res = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${algNoneToken}`);

      expect([401, 403]).toContain(res.status);
    });
  });

  describe('2. RBAC & Privilege Escalation Defense (OWASP A01)', () => {
    it('Should reject anonymous requests to protected business APIs', async () => {
      const res = await request(app.getHttpServer()).get('/api/audit-plans');
      expect([401, 403]).toContain(res.status);
    });

    it('Should reject unauthenticated requests to system configs', async () => {
      const res = await request(app.getHttpServer()).get('/api/system-config');
      expect([401, 403, 404]).toContain(res.status);
    });
  });

  describe('3. SSRF Protection (OWASP A10)', () => {
    it('Should block database connection tests to localhost (127.0.0.1)', async () => {
      if (!adminToken) return;

      const res = await request(app.getHttpServer())
        .post('/api/external-database/test-connection')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'postgres',
          host: '127.0.0.1',
          port: 5432,
          username: 'postgres',
          password: 'password',
          database: 'test',
        });

      expect([400, 403]).toContain(res.status);
      if (res.status === 400 && res.body?.message) {
        expect(res.body.message).toMatch(/SSRF/i);
      }
    });

    it('Should block database connection tests to AWS metadata IP (169.254.169.254)', async () => {
      if (!adminToken) return;

      const res = await request(app.getHttpServer())
        .post('/api/external-database/test-connection')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'postgres',
          host: '169.254.169.254',
          port: 80,
          username: 'admin',
          password: 'password',
          database: 'test',
        });

      expect([400, 403]).toContain(res.status);
    });
  });

  describe('4. Injection & Input Sanitization (OWASP A03)', () => {
    it('Should handle SQL injection strings safely without crashing (500)', async () => {
      const token = adminToken || auditorToken;
      const res = await request(app.getHttpServer())
        .get(`/api/audit-plans?search=${encodeURIComponent("' OR '1'='1")}`)
        .set('Authorization', token ? `Bearer ${token}` : '');

      expect(res.status).not.toBe(500);
      const text = JSON.stringify(res.body || '').toLowerCase();
      expect(text).not.toContain('syntax error');
      expect(text).not.toContain('pg_sleep');
    });
  });

  describe('5. Security Headers & Information Disclosure (OWASP A05)', () => {
    it('Should not expose stack trace on 404/500 errors', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/invalid-non-existent-route-12345',
      );
      expect(res.status).toBe(404);
      const text = JSON.stringify(res.body || '');
      expect(text).not.toContain('node_modules');
      expect(text).not.toContain('at processTicksAndRejections');
    });
  });
});
