import { Controller, Headers, Logger, Post, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { WebhookReceiver } from 'livekit-server-sdk';
import { Public } from '../common/decorators/public.decorator';
import { CallsService } from './calls.service';

@Controller('livekit')
export class LivekitWebhookController {
  private readonly logger = new Logger(LivekitWebhookController.name);

  constructor(private readonly calls: CallsService) {}

  @Public()
  @Post('webhook')
  async handleWebhook(
    @Req() req: FastifyRequest<{ Body: string }>,
    @Headers('authorization') authHeader?: string,
  ) {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) {
      this.logger.warn('LiveKit webhook received but LiveKit is not configured');
      return { ok: true };
    }

    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    const receiver = new WebhookReceiver(apiKey, apiSecret);

    try {
      const event = await receiver.receive(body, authHeader);
      const roomName = event.room?.name;
      if (roomName) {
        await this.calls.handleLivekitWebhook(event.event, roomName);
      }
    } catch (err) {
      this.logger.warn(`LiveKit webhook validation failed: ${String(err)}`);
    }

    return { ok: true };
  }
}
