import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  createPostSchema,
  exploreSchema,
  updatePostSchema,
  type CreatePostInput,
  type ExploreInput,
  type UpdatePostInput,
} from '@agahiram/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PostsService } from './posts.service';
import { FeedService } from './feed.service';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly feedService: FeedService,
  ) {}

  @Public()
  @Get('feed')
  feed(@Query('cursor') cursor?: string, @CurrentUser('sub') userId?: string) {
    return this.feedService.getHomeFeed(userId, cursor);
  }

  @Public()
  @Get('explore')
  @UsePipes(new ZodValidationPipe(exploreSchema))
  explore(@Query() query: ExploreInput) {
    return this.feedService.getExplore(query);
  }

  @Public()
  @Get('reels')
  reels(@Query('cursor') cursor?: string) {
    return this.feedService.getReels(cursor);
  }

  @Public()
  @Get('user/:username')
  userPosts(
    @Param('username') username: string,
    @Query('cursor') cursor?: string,
    @CurrentUser('sub') viewerId?: string,
  ) {
    return this.postsService.getUserPosts(username, viewerId, cursor);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @UsePipes(new ZodValidationPipe(createPostSchema))
  create(@CurrentUser('sub') userId: string, @Body() body: CreatePostInput) {
    return this.postsService.create(userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @UsePipes(new ZodValidationPipe(updatePostSchema))
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() body: UpdatePostInput,
  ) {
    return this.postsService.update(userId, id, body);
  }

  @Public()
  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser('sub') viewerId?: string) {
    return this.postsService.getById(id, viewerId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/sold')
  markSold(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.postsService.markSold(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.postsService.delete(userId, id);
  }

  @Public()
  @Post(':id/contact')
  contact(@Param('id') id: string, @CurrentUser('sub') viewerId?: string) {
    return this.postsService.logContactImpression(id, viewerId);
  }
}
