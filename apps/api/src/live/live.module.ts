import { Module } from '@nestjs/common';

import { LiveController } from './live.controller';

import { LiveService } from './live.service';

import { CallsModule } from '../calls/calls.module';

@Module({
  imports: [CallsModule],

  controllers: [LiveController],

  providers: [LiveService],
})
export class LiveModule {}
