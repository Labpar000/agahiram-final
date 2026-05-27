import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DEFAULT_PLATFORM_SETTINGS, type PlatformSettings } from '@agahiram/shared';
import { PrismaService } from '../prisma/prisma.service';

/**
 * In-process cache of platform settings. Settings are read on nearly every
 * authenticated request (rate limits, maintenance gate, etc.) so a 30s TTL keeps
 * the DB load negligible while still propagating admin edits within a few seconds.
 */
const CACHE_TTL_MS = 30_000;

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  private cache: PlatformSettings = { ...DEFAULT_PLATFORM_SETTINGS };
  private cacheLoadedAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.refresh().catch((e) =>
      this.logger.warn(`initial settings load failed: ${(e as Error).message}`),
    );
  }

  async get(): Promise<PlatformSettings> {
    if (Date.now() - this.cacheLoadedAt > CACHE_TTL_MS) {
      await this.refresh().catch(() => null);
    }
    return { ...this.cache };
  }

  /** Synchronous accessor for hot paths. Returns possibly-stale settings. */
  getCached(): PlatformSettings {
    return this.cache;
  }

  async refresh(): Promise<PlatformSettings> {
    const rows = await this.prisma.platformSetting.findMany();
    const merged: Record<string, unknown> = { ...DEFAULT_PLATFORM_SETTINGS };
    for (const row of rows) {
      merged[row.key] = row.value as unknown;
    }
    this.cache = merged as unknown as PlatformSettings;
    this.cacheLoadedAt = Date.now();
    return { ...this.cache };
  }

  async update(patch: Partial<PlatformSettings>, actorId?: string): Promise<PlatformSettings> {
    const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return this.get();

    await this.prisma.$transaction(
      entries.map(([key, value]) =>
        this.prisma.platformSetting.upsert({
          where: { key },
          update: { value: value as never, updatedBy: actorId ?? null },
          create: { key, value: value as never, updatedBy: actorId ?? null },
        }),
      ),
    );
    return this.refresh();
  }
}
