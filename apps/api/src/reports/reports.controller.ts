import { Body, Controller, Post, UseGuards, UsePipes } from '@nestjs/common';
import { createReportSchema, type CreateReportInput } from '@agahiram/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UsePipes(new ZodValidationPipe(createReportSchema))
  create(@CurrentUser('sub') userId: string, @Body() body: CreateReportInput) {
    return this.reports.create(userId, body);
  }
}
