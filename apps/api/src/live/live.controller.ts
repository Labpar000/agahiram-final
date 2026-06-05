import { Body, Controller, Get, Param, Post, UseGuards, UsePipes } from '@nestjs/common';
import { createLiveSchema, type CreateLiveInput } from '@agahiram/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { LiveService } from './live.service';

@Controller('live')
export class LiveController {
  constructor(private readonly service: LiveService) {}

  @Public()
  @Get()
  list() {
    return this.service.listLive();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @UsePipes(new ZodValidationPipe(createLiveSchema))
  create(@CurrentUser('sub') userId: string, @Body() body: CreateLiveInput) {
    return this.service.create(userId, body.title, body.linkedPostId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/start')
  start(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.service.start(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/end')
  end(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.service.end(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/token')
  token(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.service.getToken(userId, id, false);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/publisher-token')
  publisherToken(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.service.getToken(userId, id, true);
  }
}
