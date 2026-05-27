import { Body, Controller, Get, Param, Post, Query, UseGuards, UsePipes } from '@nestjs/common';
import { sendMessageSchema, type SendMessageInput } from '@agahiram/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { MessagesService } from './messages.service';

@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly service: MessagesService) {}

  @Get('conversations')
  conversations(@CurrentUser('sub') userId: string) {
    return this.service.listConversations(userId);
  }

  @Get('conversations/:id')
  messages(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.service.getMessages(userId, id, cursor);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(sendMessageSchema))
  send(@CurrentUser('sub') userId: string, @Body() body: SendMessageInput) {
    return this.service.send(userId, body);
  }

  @Post('start/:username')
  start(@CurrentUser('sub') userId: string, @Param('username') username: string) {
    return this.service.startWithUser(userId, username);
  }
}
