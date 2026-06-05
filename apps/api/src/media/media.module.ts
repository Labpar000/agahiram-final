import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MediaController } from './media.controller';
import { getJwtSecret } from '../config/secrets';
import { MediaService } from './media.service';
import { MinioService } from './minio.service';
import { MediaAccessService } from './media-access.service';

@Module({
  imports: [JwtModule.register({ secret: getJwtSecret() })],
  controllers: [MediaController],
  providers: [MediaService, MinioService, MediaAccessService],
  exports: [MediaService, MinioService, MediaAccessService],
})
export class MediaModule {}
