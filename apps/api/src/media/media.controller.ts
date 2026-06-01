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
import { MinioService } from './minio.service';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(
    private mediaService: MediaService,
    private minio: MinioService,
  ) {}

  @Public()
  @Get('object')
  async object(@Query('key') keyRaw: string, @Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const key = this.minio.getKeyFromUrl(keyRaw);
    if (!key) throw new BadRequestException('کلید فایل نامعتبر است');

    // Forward Range so video can stream progressively + seek (otherwise the
    // browser has to download the whole file before playback starts).
    const range = req.headers.range;
    const object = await this.minio.getObject(key, range);
    const body = object.Body;
    if (!body) throw new BadRequestException('فایل یافت نشد');

    // Some legacy uploads landed without a proper Content-Type and come
    // back as `application/octet-stream`, which makes the Next.js image
    // optimizer reject them with a 400. Recover the correct MIME from the
    // file extension so images keep working regardless of how they were
    // originally uploaded.
    const contentType = pickContentType(object.ContentType, key, normalizedFolderFromKey(key));

    res.header('Content-Type', contentType);
    res.header('Cache-Control', 'public, max-age=31536000, immutable');
    res.header('Accept-Ranges', 'bytes');
    if (object.ContentLength != null) res.header('Content-Length', String(object.ContentLength));
    if (object.ContentRange) {
      res.header('Content-Range', object.ContentRange);
      res.status(206);
    } else if (range) {
      // Client asked for a range but storage returned the full body — still signal OK.
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
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  m3u8: 'application/vnd.apple.mpegurl',
  ts: 'video/mp2t',
};

/**
 * MinIO returns whatever Content-Type was set at upload time. Some older media
 * was stored as `application/octet-stream` (or with no Content-Type at all),
 * which then makes the Next.js image optimizer reject the response. If storage
 * is giving us a generic/unknown type, fall back to the extension-derived MIME
 * so browsers and image optimizers can render the file correctly.
 */
function normalizedFolderFromKey(key: string): string | null {
  const segment = key.split('/')[0]?.toLowerCase() ?? '';
  return segment || null;
}

function pickContentType(stored: string | undefined, key: string, folder: string | null): string {
  const generic =
    !stored || stored === 'application/octet-stream' || stored === 'binary/octet-stream';
  if (!generic && stored) return stored;
  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'webm' && folder === 'messages') {
    return 'audio/webm';
  }
  return EXTENSION_CONTENT_TYPES[ext] ?? stored ?? 'application/octet-stream';
}
