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
import { updateProfileSchema, type UpdateProfileInput } from '@agahiram/shared';
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

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @UsePipes(new ZodValidationPipe(updateProfileSchema))
  async updateMe(@CurrentUser('sub') userId: string, @Body() body: UpdateProfileInput) {
    return this.usersService.updateProfile(userId, body);
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
  async followers(@Param('username') username: string) {
    const target = await this.usersService.getProfileByUsername(username);
    return this.usersService.getFollowers(target.id);
  }

  @Public()
  @Get(':username/following')
  async following(@Param('username') username: string) {
    const target = await this.usersService.getProfileByUsername(username);
    return this.usersService.getFollowing(target.id);
  }
}
