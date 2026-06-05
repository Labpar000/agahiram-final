import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { BULL_QUEUES } from '@agahiram/shared';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';
import { CallsGateway } from './calls.gateway';
import { LivekitService } from './livekit.service';
import { CallTimeoutProcessor } from './call-timeout.processor';
import { MessagesModule } from '../messages/messages.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { getJwtSecret } from '../config/secrets';

@Module({
  imports: [
    MessagesModule,
    NotificationsModule,
    JwtModule.register({ secret: getJwtSecret() }),
    BullModule.registerQueue({ name: BULL_QUEUES.CALL_TIMEOUT }),
  ],
  controllers: [CallsController],
  providers: [CallsService, CallsGateway, LivekitService, CallTimeoutProcessor],
  exports: [CallsService, CallsGateway, LivekitService],
})
export class CallsModule {}
