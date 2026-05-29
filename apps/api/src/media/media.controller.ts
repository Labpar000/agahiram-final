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

    res.header('Content-Type', object.ContentType ?? 'application/octet-stream');
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
