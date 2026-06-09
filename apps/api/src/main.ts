import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import { Logger } from '@nestjs/common';
import { MAX_VIDEO_UPLOAD_BYTES } from '@agahiram/shared';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { getCookieSecret } from './config/secrets';
import { getCorsOrigins } from './config/cors';

const UPLOAD_BODY_LIMIT = MAX_VIDEO_UPLOAD_BYTES + 5 * 1024 * 1024;

const UPLOAD_CONTENT_TYPES = [
  'application/octet-stream',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
] as const;

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true, bodyLimit: UPLOAD_BODY_LIMIT }),
  );

  const fastify = app.getHttpAdapter().getInstance();
  for (const contentType of UPLOAD_CONTENT_TYPES) {
    fastify.addContentTypeParser(
      contentType,
      { parseAs: 'buffer', bodyLimit: UPLOAD_BODY_LIMIT },
      (_req, body, done) => {
        done(null, body);
      },
    );
  }

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
