import { Body, Controller, Get, Post, Query, UseGuards, UsePipes } from '@nestjs/common';
import {
  createPayoutSchema,
  initiatePaymentSchema,
  type CreatePayoutInput,
  type InitiatePaymentInput,
} from '@agahiram/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Public()
  @Get('boost-plans')
  plans() {
    return this.service.getBoostPlans();
  }

  @UseGuards(JwtAuthGuard)
  @Post('initiate')
  @UsePipes(new ZodValidationPipe(initiatePaymentSchema))
  initiate(@CurrentUser('sub') userId: string, @Body() body: InitiatePaymentInput) {
    return this.service.initiate(userId, body);
  }

  @Public()
  @Get('verify')
  verify(@Query('Authority') authority: string, @Query('Status') status: string) {
    return this.service.verify(authority, status);
  }

  @UseGuards(JwtAuthGuard)
  @Get('wallet')
  wallet(@CurrentUser('sub') userId: string) {
    return this.service.getWallet(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  history(@CurrentUser('sub') userId: string) {
    return this.service.listMyPayments(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('payouts')
  @UsePipes(new ZodValidationPipe(createPayoutSchema))
  createPayout(@CurrentUser('sub') userId: string, @Body() body: CreatePayoutInput) {
    return this.service.createPayout(userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('payouts')
  payouts(@CurrentUser('sub') userId: string) {
    return this.service.listMyPayouts(userId);
  }
}
