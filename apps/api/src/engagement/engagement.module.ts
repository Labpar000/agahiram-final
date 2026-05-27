import { Module } from '@nestjs/common';
import { EngagementController } from './engagement.controller';
import { LikesService } from './likes.service';
import { CommentsService } from './comments.service';
import { SavesService } from './saves.service';

@Module({
  controllers: [EngagementController],
  providers: [LikesService, CommentsService, SavesService],
  exports: [LikesService, CommentsService, SavesService],
})
export class EngagementModule {}
