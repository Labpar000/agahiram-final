import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { BULL_QUEUES } from '@agahiram/shared';
import { AdminController } from './admin.controller';
import { AdminContentController } from './admin-content.controller';
import { AdminSystemController } from './admin-system.controller';
import { AdminService } from './admin.service';
import { AdminGateway } from './admin.gateway';
import { NotificationsModule } from '../notifications/notifications.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    NotificationsModule,
    SearchModule,
    JwtModule.register({}),
    BullModule.registerQueue(
      { name: BULL_QUEUES.SEARCH_INDEX },
      { name: BULL_QUEUES.NOTIFICATIONS },
      { name: BULL_QUEUES.STORY_CLEANUP },
      { name: BULL_QUEUES.MEDIA_PROCESSING },
    ),
  ],
  controllers: [AdminController, AdminContentController, AdminSystemController],
  providers: [AdminService, AdminGateway],
  exports: [AdminGateway],
})
export class AdminModule {}
