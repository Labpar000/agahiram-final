import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public readonly client: Redis;
  public readonly pub: Redis;
  public readonly sub: Redis;

  constructor() {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this.client = new Redis(url, { maxRetriesPerRequest: null, lazyConnect: true });
    this.pub = new Redis(url, { maxRetriesPerRequest: null, lazyConnect: true });
    this.sub = new Redis(url, { maxRetriesPerRequest: null, lazyConnect: true });
  }

  async onModuleInit() {
    await Promise.all([this.client.connect(), this.pub.connect(), this.sub.connect()]);
    this.logger.log('Redis connected');
  }

  async onModuleDestroy() {
    await Promise.all([this.client.quit(), this.pub.quit(), this.sub.quit()]);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }
}
