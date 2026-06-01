import { Module } from '@nestjs/common';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';
import { CallsGateway } from './calls.gateway';
import { LivekitService } from './livekit.service';
import { PushModule } from '../push/push.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [PushModule, MessagesModule],
  controllers: [CallsController],
  providers: [CallsService, CallsGateway, LivekitService],
  exports: [CallsService, CallsGateway, LivekitService],
})
export class CallsModule {}
