import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { JwtPayload } from '@agahiram/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MediaService } from './media.service';
import { S3Service } from './s3.service';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(
    private mediaService: MediaService,
    private s3: S3Service,
  ) {}

  @Public()
  @Get('object')
  async object(@Query('key') keyRaw: string, @Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const key = this.s3.getKeyFromUrl(keyRaw);
    if (!key) throw new BadRequestException('کلید فایل نامعتبر است');

    // Forward Range so video can stream progressively + seek (otherwise the
    // browser has to download the whole file before playback starts).
    const range = req.headers.range;
    const object = await this.s3.getObject(key, range);
    const body = object.Body;
    if (!body) throw new BadRequestException('فایل یافت نشد');

    // Some legacy uploads landed in S3 without a proper Content-Type and come
    // back as `application/octet-stream`, which makes the Next.js image
    // optimizer reject them with a 400. Recover the correct MIME from the
    // file extension so images keep working regardless of how they were
    // originally uploaded.
    const contentType = pickContentType(object.ContentType, key);

    res.header('Content-Type', contentType);
    res.header('Cache-Control', 'public, max-age=31536000, immutable');
    res.header('Accept-Ranges', 'bytes');
    if (object.ContentLength != null) res.header('Content-Length', String(object.ContentLength));
    if (object.ContentRange) {
      res.header('Content-Range', object.ContentRange);
      res.status(206);
    } else if (range) {
      // Client asked for a range but S3 returned the full body — still signal OK.
      res.status(200);
    }
    return res.send(body);
  }

  @Post('presign')
  presign(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: { folder: string; contentType: string; extension?: string },
  ) {
    return this.mediaService.getPresignedUploadUrl(
      user.sub,
      body.folder,
      body.contentType,
      body.extension,
    );
  }

  @Post('confirm')
  confirm(@CurrentUser() user: JwtPayload, @Body() body: { key: string }) {
    return this.mediaService.confirmUpload(user.sub, body.key);
  }
}

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  m3u8: 'application/vnd.apple.mpegurl',
  ts: 'video/mp2t',
};

/**
 * S3 returns whatever Content-Type was set at upload time. Some older media
 * was stored as `application/octet-stream` (or with no Content-Type at all),
 * which then makes the Next.js image optimizer reject the response. If S3 is
 * giving us a generic/unknown type, fall back to the extension-derived MIME
 * so browsers and image optimizers can render the file correctly.
 */
function pickContentType(stored: string | undefined, key: string): string {
  const generic =
    !stored || stored === 'application/octet-stream' || stored === 'binary/octet-stream';
  if (!generic && stored) return stored;
  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_CONTENT_TYPES[ext] ?? stored ?? 'application/octet-stream';
}
