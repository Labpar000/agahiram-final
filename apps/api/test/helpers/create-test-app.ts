import { type INestApplication, type Type } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';

type ModuleBuilder = ReturnType<typeof Test.createTestingModule>;

type CreateTestAppOptions = {
  controllers?: Type<unknown>[];
  providers?: unknown[];
};

export async function createTestApp(
  configure: (builder: ModuleBuilder) => ModuleBuilder,
  options: CreateTestAppOptions = {},
): Promise<NestFastifyApplication> {
  const builder = Test.createTestingModule({
    controllers: options.controllers ?? [],
    providers: options.providers ?? [],
  });
  const moduleFixture: TestingModule = await configure(builder).compile();

  const app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.setGlobalPrefix('api/v1');
  app.useGlobalInterceptors(new TransformInterceptor());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

export async function closeTestApp(app: INestApplication | NestFastifyApplication): Promise<void> {
  await app.close();
}
