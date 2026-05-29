import { Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { Public } from '../common/decorators/public.decorator';

/**
 * Sink endpoint for Core Web Vitals beacons sent from the web client. The
 * browser fires `navigator.sendBeacon` (best-effort, fire-and-forget) with a
 * JSON-serialised metric payload. We accept it as `text/plain` because that's
 * the default content-type sendBeacon uses when you pass a string. We don't
 * persist the metric today — the goal of this endpoint is purely to avoid the
 * client logging a 404 in production. Tail this in `LoggingInterceptor` if you
 * want to spot regressions ad-hoc.
 */
@Controller('metrics')
export class MetricsController {
  @Public()
  @Post('web-vitals')
  @HttpCode(HttpStatus.NO_CONTENT)
  webVitals(@Req() _req: FastifyRequest): void {
    // intentionally empty — see class jsdoc
  }
}
