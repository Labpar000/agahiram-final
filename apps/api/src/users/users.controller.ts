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
  blockUserSchema,
  notificationPreferencesSchema,
  updateProfileSchema,
  type NotificationPreferencesInput,
  type UpdateProfileInput,
} from '@agahiram/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get('search')
  async search(@Query('q') q: string) {
    if (!q || q.length < 2) return [];
    return this.usersService.searchUsers(q);
  }

  @Public()
  @Get('username/availability')
  async usernameAvailability(
    @Query('username') username: string,
    @CurrentUser('sub') viewerId?: string,
  ) {
    if (!username || username.length < 3) return { username, available: false };
    return this.usersService.checkUsernameAvailability(username, viewerId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @UsePipes(new ZodValidationPipe(updateProfileSchema))
  async updateMe(@CurrentUser('sub') userId: string, @Body() body: UpdateProfileInput) {
    return this.usersService.updateProfile(userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/notification-preferences')
  async notificationPreferences(@CurrentUser('sub') userId: string) {
    return this.usersService.getNotificationPreferences(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/notification-preferences')
  @UsePipes(new ZodValidationPipe(notificationPreferencesSchema))
  async updateNotificationPreferences(
    @CurrentUser('sub') userId: string,
    @Body() body: NotificationPreferencesInput,
  ) {
    return this.usersService.updateNotificationPreferences(userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/blocked')
  async blocked(@CurrentUser('sub') userId: string) {
    return this.usersService.getBlockedUsers(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/mention-candidates')
  async mentionCandidates(@CurrentUser('sub') userId: string, @Query('q') q?: string) {
    return this.usersService.getMentionCandidates(userId, q);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/blocked')
  @UsePipes(new ZodValidationPipe(blockUserSchema))
  async block(@CurrentUser('sub') userId: string, @Body() body: { username: string }) {
    return this.usersService.blockUser(userId, body.username);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me/blocked/:username')
  async unblock(@CurrentUser('sub') userId: string, @Param('username') username: string) {
    return this.usersService.unblockUser(userId, username);
  }

  @Public()
  @Get(':username/reputation')
  async reputation(@Param('username') username: string) {
    return this.usersService.getUserReputation(username);
  }

  @Public()
  @Get(':username')
  async getProfile(@Param('username') username: string, @CurrentUser('sub') viewerId?: string) {
    return this.usersService.getProfileByUsername(username, viewerId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':username/follow')
  async follow(@CurrentUser('sub') userId: string, @Param('username') username: string) {
    const target = await this.usersService.getProfileByUsername(username);
    return this.usersService.follow(userId, target.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':username/follow')
  async unfollow(@CurrentUser('sub') userId: string, @Param('username') username: string) {
    const target = await this.usersService.getProfileByUsername(username);
    return this.usersService.unfollow(userId, target.id);
  }

  @Public()
  @Get(':username/followers')
  async followers(
    @Param('username') username: string,
    @CurrentUser('sub') viewerId?: string,
    @Query('q') q?: string,
  ) {
    const target = await this.usersService.getProfileByUsername(username);
    return this.usersService.getFollowers(target.id, viewerId, q);
  }

  @Public()
  @Get(':username/following')
  async following(
    @Param('username') username: string,
    @CurrentUser('sub') viewerId?: string,
    @Query('q') q?: string,
  ) {
    const target = await this.usersService.getProfileByUsername(username);
    return this.usersService.getFollowing(target.id, viewerId, q);
  }
}
