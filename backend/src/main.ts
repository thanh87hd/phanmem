import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

import fastifyHelmet from '@fastify/helmet';
import fastifyCookie from '@fastify/cookie';
import contentParser from '@fastify/multipart';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

function parseAllowedOrigins(value?: string): string[] {
  return (value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function validateProductionEnvironment(configService: ConfigService) {
  const isProd = configService.get<string>('NODE_ENV') === 'production';
  if (!isProd) return;

  const jwtSecret = configService.get<string>('JWT_SECRET');
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error(
      '[CRITICAL SECURITY CONFIG] JWT_SECRET must be set and at least 32 characters in production.',
    );
  }

  const dbPass = configService.get<string>('DB_PASSWORD');
  if (
    !dbPass ||
    dbPass === 'ktnb_password' ||
    dbPass === 'ktnb_password_prod' ||
    dbPass === 'postgres' ||
    dbPass === 'admin'
  ) {
    throw new Error(
      '[CRITICAL SECURITY CONFIG] Default database password detected. You must set a strong DB_PASSWORD in production.',
    );
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit: 52428800, trustProxy: true }), // 50MB
  );
  const configService = app.get(ConfigService);

  // Validate production safety rules
  validateProductionEnvironment(configService);

  // Correlation ID propagation hook for request tracing
  const fastifyInstance = app.getHttpAdapter().getInstance();
  fastifyInstance.addHook('onRequest', (request: any, reply: any, done: any) => {
    const correlationId = request.headers['x-correlation-id'] || randomUUID();
    request.headers['x-correlation-id'] = correlationId;
    reply.header('x-correlation-id', correlationId);
    done();
  });

  await app.register(fastifyCookie);
  await app.register(fastifyHelmet);
  await app.register(contentParser, {
    attachFieldsToBody: 'keyValues',
    limits: {
      fileSize: 52428800, // 50MB max per file
      files: 10, // max 10 files per request
    },
    onFile: async (part: any) => {
      const buffer = await part.toBuffer();
      part.value = {
        filename: part.filename,
        mimetype: part.mimetype,
        encoding: part.encoding,
        _buf: buffer,
        size: buffer.length,
      };
    },
  });

  app.setGlobalPrefix('api');

  // Trust Nginx reverse proxy for secure cookies and accurate IPs
  const allowedOrigins = parseAllowedOrigins(
    configService.get<string>('CORS_ORIGINS'),
  );
  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes('*')
      ) {
        callback(null, true);
      } else {
        console.warn(
          `[CORS Rejected] Origin: "${origin}". Allowed Origins: ${JSON.stringify(allowedOrigins)}`,
        );
        callback(new Error(`Origin "${origin}" is not allowed by CORS`), false);
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global validation pipe — validates all incoming DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = configService.get<number>('PORT') || 3001;

  const httpServer = app.getHttpServer();
  if (httpServer && typeof httpServer.setTimeout === 'function') {
    httpServer.setTimeout(1800000); // 30 minutes for bulk upload
  }

  const bindHost = configService.get<string>('BIND_HOST') || '127.0.0.1';
  await app.listen(port, bindHost);
  console.log(`🚀 Backend đang chạy tại: http://${bindHost}:${port}`);
}
void bootstrap();
