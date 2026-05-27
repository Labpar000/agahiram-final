import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true }),
  );

  await app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET ?? 'agahiram-dev-cookie-secret',
  });

  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') ?? [
    process.env.FRONTEND_URL ?? 'http://localhost:3000',
    process.env.ADMIN_URL ?? 'http://localhost:3001',
    /* legacy port some dev configs still use; keep until next major. */
    'http://localhost:5174',
  ];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // All API endpoints are under /api/v1. Validation is per-route via ZodValidationPipe
  // (we deliberately do not register class-validator's global ValidationPipe).
  app.setGlobalPrefix('api/v1');

  app.useGlobalFilters(new HttpExceptionFilter(), new PrismaExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  console.log(`Agahiram API running on http://localhost:${port}/api/v1`);
  console.log(
    `[boot] JWT_SECRET fingerprint: ${(process.env.JWT_SECRET ?? 'default').slice(0, 8)}... DATABASE=${(process.env.DATABASE_URL ?? '').split('@')[1] ?? 'default'}`,
  );
}

bootstrap();
