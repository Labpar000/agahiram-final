import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  submitVerificationSchema,
  rejectVerificationSchema,
  UserRole,
  type SubmitVerificationInput,
  type RejectVerificationInput,
} from '@agahiram/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { VerificationsService } from './verifications.service';

@Controller()
export class VerificationsController {
  constructor(private readonly verificationsService: VerificationsService) {}

  @Public()
  @Get('verifications/types')
  getTypes() {
    return this.verificationsService.getVerificationTypes();
  }

  @UseGuards(JwtAuthGuard)
  @Post('verifications/submit')
  submit(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(submitVerificationSchema)) body: SubmitVerificationInput,
  ) {
    return this.verificationsService.submitVerification(userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('verifications/status')
  getStatus(@CurrentUser('sub') userId: string) {
    return this.verificationsService.getMyVerifications(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Get('admin/verifications')
  adminList(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.verificationsService.getAdminVerifications({
      type,
      status,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Get('admin/verifications/:id')
  adminGetOne(@Param('id') id: string) {
    return this.verificationsService.getVerificationById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Post('admin/verifications/:id/approve')
  approve(@CurrentUser('sub') adminId: string, @Param('id') id: string) {
    return this.verificationsService.approveVerification(adminId, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Post('admin/verifications/:id/reject')
  reject(
    @CurrentUser('sub') adminId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectVerificationSchema)) body: RejectVerificationInput,
  ) {
    return this.verificationsService.rejectVerification(adminId, id, body);
  }
}
