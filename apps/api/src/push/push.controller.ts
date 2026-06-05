import { Body, Controller, Delete, Get, Headers, Post, UseGuards, UsePipes } from '@nestjs/common';
import { pushSubscribeSchema, pushUnsubscribeSchema } from '@agahiram/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PushService } from './push.service';

@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Public()
  @Get('vapid-public-key')
  vapidKey() {
    return this.push.vapidPublicKey();
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscribe')
  @UsePipes(new ZodValidationPipe(pushSubscribeSchema))
  subscribe(
    @CurrentUser('sub') userId: string,
    @Body() body: { endpoint: string; keys: { p256dh: string; auth: string } },
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.push.subscribe(userId, body, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('subscribe')
  @UsePipes(new ZodValidationPipe(pushUnsubscribeSchema))
  unsubscribe(@CurrentUser('sub') userId: string, @Body() body: { endpoint: string }) {
    return this.push.unsubscribe(userId, body.endpoint);
  }
}
