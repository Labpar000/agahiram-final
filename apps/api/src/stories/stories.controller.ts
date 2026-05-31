import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  createHighlightSchema,
  createStorySchema,
  storyReactionSchema,
  storyReplySchema,
  updateHighlightSchema,
} from '@agahiram/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { StoriesService } from './stories.service';
import { HighlightsService } from './highlights.service';

@Controller()
export class StoriesController {
  constructor(
    private readonly stories: StoriesService,
    private readonly highlights: HighlightsService,
  ) {}

  @Public()
  @Get('stories/feed')
  feed(@CurrentUser('sub') userId?: string) {
    return this.stories.getFeedStories(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('stories')
  @UsePipes(new ZodValidationPipe(createStorySchema))
  create(
    @CurrentUser('sub') userId: string,
    @Body()
    body: {
      mediaKey: string;
      type: 'image' | 'video';
      linkedPostId?: string;
      overlayJson?: Record<string, unknown>;
      durationMs?: number;
    },
  ) {
    return this.stories.create(userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('stories/:id/reactions')
  @UsePipes(new ZodValidationPipe(storyReactionSchema))
  react(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() body: { emoji: string },
  ) {
    return this.stories.react(userId, id, body.emoji);
  }

  @UseGuards(JwtAuthGuard)
  @Post('stories/:id/reply')
  @UsePipes(new ZodValidationPipe(storyReplySchema))
  reply(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() body: { text: string },
  ) {
    return this.stories.reply(userId, id, body.text);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stories/:id/reactions/summary')
  reactionSummary(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.stories.reactionSummary(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('stories/:id/view')
  view(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.stories.view(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stories/:id/views')
  views(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.stories.listViewers(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('stories/:id')
  delete(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.stories.delete(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('highlights')
  @UsePipes(new ZodValidationPipe(createHighlightSchema))
  createHighlight(
    @CurrentUser('sub') userId: string,
    @Body() body: { title: string; storyIds: string[]; coverStoryId?: string },
  ) {
    return this.highlights.create(userId, body.title, body.storyIds, body.coverStoryId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('highlights/:id')
  @UsePipes(new ZodValidationPipe(updateHighlightSchema))
  updateHighlight(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() body: { title?: string; coverStoryId?: string },
  ) {
    return this.highlights.update(userId, id, body);
  }

  @Public()
  @Get('users/:username/highlights')
  userHighlights(@Param('username') username: string) {
    return this.highlights.listByUser(username);
  }

  @Public()
  @Get('highlights/:id/stories')
  highlightStories(@Param('id') id: string) {
    return this.highlights.getStories(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('highlights/:id')
  deleteHighlight(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.highlights.delete(userId, id);
  }
}
