import { Body, Controller, Get, Param, Post, Query, UseGuards, UsePipes } from '@nestjs/common';
import { sendMessageSchema, type SendMessageInput } from '@agahiram/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { MessagesService } from './messages.service';
import { MessagesGateway } from './messages.gateway';

@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(
    private readonly service: MessagesService,
    private readonly gateway: MessagesGateway,
  ) {}

  @Get('unread-count')
  unreadCount(@CurrentUser('sub') userId: string) {
    return this.service.getUnreadCount(userId);
  }

  @Get('conversations')
  conversations(
    @CurrentUser('sub') userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(50, Math.max(1, parseInt(limit, 10) || 30)) : 30;
    return this.service.listConversations(userId, cursor, parsedLimit);
  }

  @Get('conversations/:id/head')
  conversationHead(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.service.getConversationHead(userId, id);
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
  async send(@CurrentUser('sub') userId: string, @Body() body: SendMessageInput) {
    const result = await this.service.send(userId, body);
    this.gateway.broadcastMessage(result);
    return result;
  }

  @Post('start/:username')
  start(@CurrentUser('sub') userId: string, @Param('username') username: string) {
    return this.service.startWithUser(userId, username);
  }
}
