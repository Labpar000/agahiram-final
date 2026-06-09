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
  closeFriendSchema,
  createHighlightSchema,
  createStoryBatchSchema,
  createStorySchema,
  patchStoryMentionsSchema,
  storyCommentSchema,
  storyHiddenFromSchema,
  storyLinkClickSchema,
  storyMuteSchema,
  storyNavigationSchema,
  storyReactionSchema,
  storyReplySchema,
  shareStoryToDmSchema,
  storyStickerAnswerSchema,
  storyStickerVoteSchema,
  storyRepostPreviewSchema,
  updateHighlightSchema,
} from '@agahiram/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { StoriesService } from './stories.service';
import { HighlightsService } from './highlights.service';
import { StoryStickersService } from './story-stickers.service';
import { StoriesInsightsService } from './stories-insights.service';
import { StoryArchiveService } from './story-archive.service';
import { CloseFriendsService } from './close-friends.service';
import { GiphyService } from '../integrations/giphy.service';
import { WeatherService } from '../integrations/weather.service';

@Controller()
export class StoriesController {
  constructor(
    private readonly stories: StoriesService,
    private readonly highlights: HighlightsService,
    private readonly stickers: StoryStickersService,
    private readonly insights: StoriesInsightsService,
    private readonly archive: StoryArchiveService,
    private readonly closeFriends: CloseFriendsService,
    private readonly giphy: GiphyService,
    private readonly weather: WeatherService,
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
    @Body() body: Parameters<StoriesService['create']>[1],
  ) {
    return this.stories.create(userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('stories/share-dm')
  @UsePipes(new ZodValidationPipe(shareStoryToDmSchema))
  shareToDm(
    @CurrentUser('sub') userId: string,
    @Body() body: { username: string; storyId?: string; storyArchiveId?: string },
  ) {
    return this.stories.shareStoryToDm(userId, body.username, body.storyId, body.storyArchiveId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stories/repost-preview')
  repostPreview(
    @CurrentUser('sub') userId: string,
    @Query('type') type: string,
    @Query('id') id: string,
  ) {
    const parsed = storyRepostPreviewSchema.parse({ type, id });
    return this.stories.getRepostPreview(userId, parsed.type, parsed.id);
  }

  @Public()
  @Get('stories/search')
  searchStories(@Query('q') q: string, @CurrentUser('sub') userId?: string) {
    return this.stories.searchStories(q ?? '', userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('stories/batch')
  @UsePipes(new ZodValidationPipe(createStoryBatchSchema))
  createBatch(
    @CurrentUser('sub') userId: string,
    @Body()
    body: {
      sessionId?: string;
      audience?: 'PUBLIC' | 'CLOSE_FRIENDS';
      allowReplies?: string;
      stories: Parameters<StoriesService['create']>[1][];
    },
  ) {
    return this.stories.createBatch(userId, body as never);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stories/archive')
  listArchive(@CurrentUser('sub') userId: string, @Query('cursor') cursor?: string) {
    return this.archive.listUserArchive(userId, cursor);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stories/insights')
  myInsights(@CurrentUser('sub') userId: string, @Query('days') days?: string) {
    return this.insights.listOwnerStoriesInsights(userId, days ? Number(days) : 7);
  }

  @Public()
  @Get('stories/hashtag/:tag')
  hashtagStories(@Param('tag') tag: string, @CurrentUser('sub') userId?: string) {
    return this.stories.discoverByHashtag(tag, userId);
  }

  @Public()
  @Get('stories/location/:cityId')
  locationStories(@Param('cityId') cityId: string, @CurrentUser('sub') userId?: string) {
    return this.stories.discoverByCity(cityId, userId);
  }

  @Public()
  @Get('integrations/giphy/search')
  giphySearch(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.giphy.search(q ?? '', limit ? Number(limit) : 20);
  }

  @Public()
  @Get('integrations/weather')
  getWeather(@Query('lat') lat: string, @Query('lon') lon: string) {
    return this.weather.getCurrent(Number(lat), Number(lon));
  }

  @Public()
  @Get('stories/users/:targetUserId')
  userStories(@Param('targetUserId') targetUserId: string, @CurrentUser('sub') viewerId?: string) {
    return this.stories.getStoriesForUser(targetUserId, viewerId);
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
  @Get('stories/:id/comments')
  listComments(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.stories.listComments(id, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('stories/:id/comments')
  @UsePipes(new ZodValidationPipe(storyCommentSchema))
  comment(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() body: { content: string },
  ) {
    return this.stories.addComment(userId, id, body.content);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('stories/:id/comments/:commentId')
  deleteComment(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
  ) {
    return this.stories.deleteComment(userId, id, commentId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('stories/:id/navigation')
  @UsePipes(new ZodValidationPipe(storyNavigationSchema))
  navigation(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() body: { type: 'FORWARD' | 'BACK' | 'EXIT' | 'NEXT_ACCOUNT' },
  ) {
    return this.stories.recordNavigation(userId, id, body.type);
  }

  @UseGuards(JwtAuthGuard)
  @Post('stories/:id/link-click')
  @UsePipes(new ZodValidationPipe(storyLinkClickSchema))
  linkClick(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() body: { url: string; stickerId?: string },
  ) {
    return this.stories.recordLinkClick(userId, id, body.url, body.stickerId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('stories/:id/mentions')
  @UsePipes(new ZodValidationPipe(patchStoryMentionsSchema))
  mentions(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() body: { usernames: string[] },
  ) {
    return this.stories.addMentions(userId, id, body.usernames);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stories/:id/reactions/summary')
  reactionSummary(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.stories.reactionSummary(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stories/:id/insights')
  storyInsights(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.insights.getStoryInsights(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('stories/:id/view')
  view(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Query('replay') replay?: string,
  ) {
    return this.stories.view(userId, id, replay === '1');
  }

  @UseGuards(JwtAuthGuard)
  @Get('stories/:id/views')
  views(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.stories.listViewers(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stories/:id/stickers/results')
  stickerResults(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.stickers.results(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('stories/:id/stickers/:stickerId/vote')
  @UsePipes(new ZodValidationPipe(storyStickerVoteSchema))
  stickerVote(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Param('stickerId') stickerId: string,
    @Body() body: { voteIndex?: number; sliderValue?: number },
  ) {
    return this.stickers.vote(userId, id, stickerId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('stories/:id/stickers/:stickerId/answer')
  @UsePipes(new ZodValidationPipe(storyStickerAnswerSchema))
  stickerAnswer(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Param('stickerId') stickerId: string,
    @Body() body: { text: string },
  ) {
    return this.stickers.answer(userId, id, stickerId, body.text);
  }

  @UseGuards(JwtAuthGuard)
  @Post('stories/:id/stickers/:stickerId/remind')
  stickerRemind(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Param('stickerId') stickerId: string,
  ) {
    return this.stickers.remind(userId, id, stickerId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('stories/:id/stickers/:stickerId/notify')
  stickerNotify(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Param('stickerId') stickerId: string,
  ) {
    return this.stickers.notifySubscribe(userId, id, stickerId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('stories/:id')
  delete(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.stories.delete(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('close-friends')
  listCloseFriends(@CurrentUser('sub') userId: string) {
    return this.closeFriends.list(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('close-friends')
  @UsePipes(new ZodValidationPipe(closeFriendSchema))
  addCloseFriend(@CurrentUser('sub') userId: string, @Body() body: { friendId: string }) {
    return this.closeFriends.add(userId, body.friendId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('close-friends/:friendId')
  removeCloseFriend(@CurrentUser('sub') userId: string, @Param('friendId') friendId: string) {
    return this.closeFriends.remove(userId, friendId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stories/privacy/hidden')
  listHiddenFrom(@CurrentUser('sub') userId: string) {
    return this.stories.listHiddenFromUsers(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('stories/privacy/hide')
  @UsePipes(new ZodValidationPipe(storyHiddenFromSchema))
  hideFrom(@CurrentUser('sub') userId: string, @Body() body: { hiddenUserId: string }) {
    return this.stories.hideStoryFrom(userId, body.hiddenUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('stories/privacy/hide/:hiddenUserId')
  unhideFrom(@CurrentUser('sub') userId: string, @Param('hiddenUserId') hiddenUserId: string) {
    return this.stories.unhideStoryFrom(userId, hiddenUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stories/mute')
  listMuted(@CurrentUser('sub') userId: string) {
    return this.stories.listMutedUsers(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('stories/mute')
  @UsePipes(new ZodValidationPipe(storyMuteSchema))
  mute(@CurrentUser('sub') userId: string, @Body() body: { mutedUserId: string }) {
    return this.stories.muteUser(userId, body.mutedUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('stories/mute/:mutedUserId')
  unmute(@CurrentUser('sub') userId: string, @Param('mutedUserId') mutedUserId: string) {
    return this.stories.unmuteUser(userId, mutedUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('highlights')
  @UsePipes(new ZodValidationPipe(createHighlightSchema))
  createHighlight(
    @CurrentUser('sub') userId: string,
    @Body()
    body: {
      title: string;
      storyIds?: string[];
      storyArchiveIds?: string[];
      coverStoryId?: string;
      coverStoryArchiveId?: string;
    },
  ) {
    return this.highlights.create(
      userId,
      body.title,
      body.storyIds,
      body.storyArchiveIds,
      body.coverStoryArchiveId,
      body.coverStoryId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('highlights/:id')
  @UsePipes(new ZodValidationPipe(updateHighlightSchema))
  updateHighlight(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() body: Parameters<HighlightsService['update']>[2],
  ) {
    return this.highlights.update(userId, id, body);
  }

  @Public()
  @Get('users/:username/highlights')
  userHighlights(@Param('username') username: string, @CurrentUser('sub') userId?: string) {
    return this.highlights.listByUser(username, userId);
  }

  @Public()
  @Get('highlights/:id/stories')
  highlightStories(@Param('id') id: string, @CurrentUser('sub') userId?: string) {
    return this.highlights.getStories(id, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('highlights/:id')
  deleteHighlight(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.highlights.delete(userId, id);
  }
}
