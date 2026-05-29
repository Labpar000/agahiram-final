import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { LikesService } from './likes.service';
import { CommentsService } from './comments.service';
import { SavesService } from './saves.service';

@Controller()
export class EngagementController {
  constructor(
    private readonly likes: LikesService,
    private readonly comments: CommentsService,
    private readonly saves: SavesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('posts/:id/like')
  like(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.likes.like(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('posts/:id/like')
  unlike(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.likes.unlike(userId, id);
  }

  @Public()
  @Get('posts/:id/comments')
  list(@Param('id') id: string, @Query('cursor') cursor?: string) {
    return this.comments.list(id, cursor);
  }

  @Public()
  @Get('comments/:id/replies')
  replies(@Param('id') id: string) {
    return this.comments.replies(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('posts/:id/comments')
  comment(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() body: { content: string; parentId?: string },
  ) {
    return this.comments.create(userId, id, body.content, body.parentId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('comments/:id')
  deleteComment(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.comments.delete(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('comments/:id/pin')
  pinComment(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() body: { pinned?: boolean },
  ) {
    return this.comments.setPinned(userId, id, body?.pinned ?? true);
  }

  @UseGuards(JwtAuthGuard)
  @Post('posts/:id/comments/toggle')
  toggleComments(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.comments.setCommentsEnabled(userId, id, Boolean(body?.enabled));
  }

  @UseGuards(JwtAuthGuard)
  @Post('posts/:id/save')
  save(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() body: { collectionId?: string },
  ) {
    return this.saves.save(userId, id, body.collectionId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('posts/:id/save')
  unsave(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.saves.unsave(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/saved')
  saved(@CurrentUser('sub') userId: string, @Query('cursor') cursor?: string) {
    return this.saves.listSaved(userId, cursor);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/collections')
  collections(@CurrentUser('sub') userId: string) {
    return this.saves.listCollections(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/collections')
  createCollection(@CurrentUser('sub') userId: string, @Body() body: { name: string }) {
    return this.saves.createCollection(userId, body.name);
  }
}
