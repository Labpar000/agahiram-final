import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { MaintenanceGuard } from './common/guards/maintenance.guard';
import { AuthModule } from './auth/auth.module';
import { BullModule } from '@nestjs/bullmq';
import { BULL_QUEUES } from '@agahiram/shared';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { PlatformModule } from './platform/platform.module';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { CategoriesModule } from './categories/categories.module';
import { LocationsModule } from './locations/locations.module';
import { MediaModule } from './media/media.module';
import { SearchModule } from './search/search.module';
import { EngagementModule } from './engagement/engagement.module';
import { NotificationsModule } from './notifications/notifications.module';
import { StoriesModule } from './stories/stories.module';
import { MessagesModule } from './messages/messages.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';
import { LiveModule } from './live/live.module';
import { AiModule } from './ai/ai.module';
import { MetricsModule } from './metrics/metrics.module';
import { ReputationModule } from './reputation/reputation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    BullModule.registerQueue(
      { name: BULL_QUEUES.SEARCH_INDEX },
      { name: BULL_QUEUES.NOTIFICATIONS },
      { name: BULL_QUEUES.STORY_CLEANUP },
      { name: BULL_QUEUES.MEDIA_PROCESSING },
    ),
    PrismaModule,
    RedisModule,
    PlatformModule,
    AuthModule,
    UsersModule,
    PostsModule,
    CategoriesModule,
    LocationsModule,
    MediaModule,
    SearchModule,
    EngagementModule,
    NotificationsModule,
    StoriesModule,
    MessagesModule,
    PaymentsModule,
    AdminModule,
    LiveModule,
    AiModule,
    MetricsModule,
    ReputationModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: MaintenanceGuard,
    },
  ],
})
export class AppModule {}
