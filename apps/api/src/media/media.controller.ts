import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtPayload } from '@agahiram/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MediaService } from './media.service';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Post('presign')
  presign(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: { folder: string; contentType: string; extension: string },
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
