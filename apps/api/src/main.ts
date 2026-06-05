import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { getCookieSecret } from './config/secrets';
import { getCorsOrigins } from './config/cors';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true, bodyLimit: 1_048_576 }),
  );

  const minioPublicUrl = process.env.MINIO_PUBLIC_URL ?? '';
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', ...(minioPublicUrl ? [minioPublicUrl] : ['*'])],
        mediaSrc: ["'self'", ...(minioPublicUrl ? [minioPublicUrl] : ['*'])],
        connectSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
  });

  await app.register(fastifyCookie, {
    secret: getCookieSecret(),
  });

  const allowedOrigins = getCorsOrigins();
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
  const logger = new Logger('Bootstrap');
  logger.log(`Agahiram API running on http://localhost:${port}/api/v1`);
}

bootstrap();
