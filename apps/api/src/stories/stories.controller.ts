import { Body, Controller, Delete, Get, Param, Post, UseGuards, UsePipes } from '@nestjs/common';
import { createHighlightSchema, createStorySchema } from '@agahiram/shared';
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
    @Body() body: { mediaKey: string; type: 'image' | 'video'; linkedPostId?: string },
  ) {
    return this.stories.create(userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('stories/:id/view')
  view(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.stories.view(userId, id);
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
    @Body() body: { title: string; storyIds: string[] },
  ) {
    return this.highlights.create(userId, body.title, body.storyIds);
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
