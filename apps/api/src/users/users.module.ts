import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BULL_QUEUES } from '@agahiram/shared';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MediaModule } from '../media/media.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReputationModule } from '../reputation/reputation.module';

@Module({
  imports: [
    MediaModule,
    NotificationsModule,
    ReputationModule,
    BullModule.registerQueue({ name: BULL_QUEUES.SEARCH_INDEX }),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
