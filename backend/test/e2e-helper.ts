import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import request from 'supertest';

export async function createE2EApp(): Promise<NestFastifyApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const adapter = new FastifyAdapter();
  const fastifyInstance = adapter.getInstance();
  if (typeof fastifyInstance.decorateReply === 'function') {
    fastifyInstance.decorateReply(
      'setCookie',
      function (this: any, name: string, value: string) {
        this.header('Set-Cookie', `${name}=${value}; Path=/`);
        return this;
      },
    );
    fastifyInstance.decorateReply(
      'clearCookie',
      function (this: any, name: string) {
        this.header(
          'Set-Cookie',
          `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
        );
        return this;
      },
    );
  }
  if (typeof fastifyInstance.decorateRequest === 'function') {
    fastifyInstance.decorateRequest('cookies', {
      getter() {
        return {};
      },
    });
  }

  const app = moduleFixture.createNestApplication<NestFastifyApplication>(
    adapter,
  );
  app.setGlobalPrefix('api');
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

export async function getAdminToken(
  app: NestFastifyApplication,
): Promise<string | null> {
  for (const password of ['@bcd1234', 'password123', 'admin123']) {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password });

    if (res.status === 200 || res.status === 201) {
      return res.body.access_token || res.body.token;
    }
  }
  return null;
}
