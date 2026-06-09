import { Body, Controller, Get, Param, Post, UseGuards, UsePipes } from '@nestjs/common';
import { createCallSchema, type CreateCallInput } from '@agahiram/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CallsService } from './calls.service';

@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(private readonly calls: CallsService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createCallSchema))
  create(@CurrentUser('sub') userId: string, @Body() body: CreateCallInput) {
    return this.calls.create(userId, body);
  }

  @Post(':id/accept')
  accept(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.calls.accept(userId, id);
  }

  @Post(':id/reject')
  reject(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.calls.reject(userId, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.calls.cancel(userId, id);
  }

  @Post(':id/end')
  end(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.calls.end(userId, id);
  }

  @Post(':id/refresh-token')
  refreshToken(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.calls.refreshToken(userId, id);
  }

  @Get('active')
  active(@CurrentUser('sub') userId: string) {
    return this.calls.getActiveForUser(userId);
  }

  @Get(':id')
  getOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.calls.getCall(userId, id);
  }
}
