import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import {
  adminSettingsSchema,
  adminUpdatePostSchema,
  banUserSchema,
  broadcastSchema,
  editUserSchema,
  refundPaymentSchema,
  rejectPostSchema,
  resolveReportSchema,
  setRoleSchema,
  UserRole,
  walletOpSchema,
  type AdminSettingsInput,
  type AdminUpdatePostInput,
  type BanUserInput,
  type BroadcastInput,
  type EditUserInput,
  type RefundPaymentInput,
  type RejectPostInput,
  type ResolveReportInput,
  type SetRoleInput,
  type WalletOpInput,
} from '@agahiram/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminService } from './admin.service';
import { AuditLogService } from './audit-log.service';
import { SettingsService } from './settings.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly service: AdminService,
    private readonly settings: SettingsService,
    private readonly audit: AuditLogService,
  ) {}

  /* ──────────── dashboard / settings ──────────── */

  @Get('stats')
  stats() {
    return this.service.stats();
  }

  @Get('settings')
  getSettings() {
    return this.settings.get();
  }

  @Post('settings')
  @UsePipes(new ZodValidationPipe(adminSettingsSchema))
  async updateSettings(@Body() body: AdminSettingsInput, @Req() req: FastifyRequest) {
    const ctx = AuditLogService.fromRequest(req);
    const updated = await this.settings.update(body, ctx.actorId);
    await this.audit.record(ctx, 'settings.update', null, body as never);
    return updated;
  }

  /* ──────────── posts ──────────── */

  @Get('posts/pending')
  pending(@Query('cursor') cursor?: string) {
    return this.service.pendingPosts(cursor);
  }

  @Get('posts')
  listPosts(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('cityId') cityId?: string,
    @Query('userId') userId?: string,
    @Query('promoted') promoted?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.listPosts({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      q,
      status,
      categoryId,
      cityId,
      userId,
      promoted: promoted === 'true' ? true : promoted === 'false' ? false : undefined,
      dateFrom,
      dateTo,
    });
  }

  @Get('posts/:id')
  getPost(@Param('id') id: string) {
    return this.service.getPost(id);
  }

  @Patch('posts/:id')
  @UsePipes(new ZodValidationPipe(adminUpdatePostSchema))
  updatePost(
    @Param('id') id: string,
    @Body() body: AdminUpdatePostInput,
    @Req() req: FastifyRequest,
  ) {
    return this.service.updatePost(id, body, AuditLogService.fromRequest(req));
  }

  @Post('posts/:id/approve')
  approve(@Param('id') id: string, @Req() req: FastifyRequest) {
    return this.service.approve(id, AuditLogService.fromRequest(req));
  }

  @Post('posts/:id/reject')
  @UsePipes(new ZodValidationPipe(rejectPostSchema))
  reject(@Param('id') id: string, @Body() body: RejectPostInput, @Req() req: FastifyRequest) {
    return this.service.reject(id, body.reason, AuditLogService.fromRequest(req));
  }

  @Post('posts/bulk-approve')
  bulkApprove(@Body() body: { ids: string[] }, @Req() req: FastifyRequest) {
    return this.service.bulkApprove(body.ids ?? [], AuditLogService.fromRequest(req));
  }

  @Delete('posts/:id')
  deletePost(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() req: FastifyRequest,
  ) {
    return this.service.deletePost(id, body?.reason, AuditLogService.fromRequest(req));
  }

  @Post('posts/:id/promote')
  forcePromote(
    @Param('id') id: string,
    @Body() body: { hours: number },
    @Req() req: FastifyRequest,
  ) {
    return this.service.forcePromote(id, body.hours ?? 24, AuditLogService.fromRequest(req));
  }

  @Post('posts/:id/expire')
  forceExpire(@Param('id') id: string, @Req() req: FastifyRequest) {
    return this.service.forceExpire(id, AuditLogService.fromRequest(req));
  }

  /* ──────────── users ──────────── */

  @Get('users')
  users(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('q') q?: string,
    @Query('role') role?: string,
    @Query('isBanned') isBanned?: string,
    @Query('isVerified') isVerified?: string,
    @Query('isBusiness') isBusiness?: string,
  ) {
    return this.service.listUsers({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      q,
      role,
      isBanned: isBanned === 'true' ? true : isBanned === 'false' ? false : undefined,
      isVerified: isVerified === 'true' ? true : isVerified === 'false' ? false : undefined,
      isBusiness: isBusiness === 'true' ? true : isBusiness === 'false' ? false : undefined,
    });
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.service.getUser(id);
  }

  @Patch('users/:id')
  @UsePipes(new ZodValidationPipe(editUserSchema))
  editUser(@Param('id') id: string, @Body() body: EditUserInput, @Req() req: FastifyRequest) {
    return this.service.editUser(id, body, AuditLogService.fromRequest(req));
  }

  @Post('users/:id/ban')
  @UsePipes(new ZodValidationPipe(banUserSchema))
  ban(@Param('id') id: string, @Body() body: BanUserInput, @Req() req: FastifyRequest) {
    return this.service.banUser(id, body.reason, AuditLogService.fromRequest(req));
  }

  @Post('users/:id/unban')
  unban(@Param('id') id: string, @Req() req: FastifyRequest) {
    return this.service.unbanUser(id, AuditLogService.fromRequest(req));
  }

  @Post('users/:id/verify')
  verify(@Param('id') id: string, @Req() req: FastifyRequest) {
    return this.service.verifyUser(id, AuditLogService.fromRequest(req));
  }

  @Post('users/:id/business')
  business(@Param('id') id: string, @Body() body: { value: boolean }, @Req() req: FastifyRequest) {
    return this.service.setBusiness(id, !!body.value, AuditLogService.fromRequest(req));
  }

  @Post('users/:id/role')
  @Roles(UserRole.ADMIN)
  @UsePipes(new ZodValidationPipe(setRoleSchema))
  setRole(@Param('id') id: string, @Body() body: SetRoleInput, @Req() req: FastifyRequest) {
    return this.service.setRole(id, body.role, AuditLogService.fromRequest(req));
  }

  @Post('users/:id/wallet/credit')
  @Roles(UserRole.ADMIN)
  @UsePipes(new ZodValidationPipe(walletOpSchema))
  walletCredit(@Param('id') id: string, @Body() body: WalletOpInput, @Req() req: FastifyRequest) {
    return this.service.walletCredit(id, body, AuditLogService.fromRequest(req));
  }

  @Post('users/:id/wallet/debit')
  @Roles(UserRole.ADMIN)
  @UsePipes(new ZodValidationPipe(walletOpSchema))
  walletDebit(@Param('id') id: string, @Body() body: WalletOpInput, @Req() req: FastifyRequest) {
    return this.service.walletDebit(id, body, AuditLogService.fromRequest(req));
  }

  /* ──────────── reports ──────────── */

  @Get('reports')
  reports(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('reason') reason?: string,
  ) {
    return this.service.listReports({
      status,
      reason,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('reports/grouped')
  groupedReports() {
    return this.service.groupedReports();
  }

  @Post('reports/:id/resolve')
  @UsePipes(new ZodValidationPipe(resolveReportSchema))
  resolveReport(
    @Param('id') id: string,
    @Body() body: ResolveReportInput,
    @Req() req: FastifyRequest,
  ) {
    return this.service.resolveReport(
      id,
      body.action,
      body.reason,
      AuditLogService.fromRequest(req),
    );
  }

  /* ──────────── comments ──────────── */

  @Get('comments')
  listComments(
    @Query('q') q?: string,
    @Query('userId') userId?: string,
    @Query('postId') postId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.listComments({
      q,
      userId,
      postId,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Delete('comments/:id')
  deleteComment(@Param('id') id: string, @Req() req: FastifyRequest) {
    return this.service.deleteComment(id, AuditLogService.fromRequest(req));
  }

  /* ──────────── payments ──────────── */

  @Get('payments')
  listPayments(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('purpose') purpose?: string,
    @Query('userId') userId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.listPayments({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status,
      purpose,
      userId,
      dateFrom,
      dateTo,
    });
  }

  @Post('payments/:id/refund')
  @Roles(UserRole.ADMIN)
  @UsePipes(new ZodValidationPipe(refundPaymentSchema))
  refund(@Param('id') id: string, @Body() body: RefundPaymentInput, @Req() req: FastifyRequest) {
    return this.service.markRefunded(id, body.reason, AuditLogService.fromRequest(req));
  }

  /* ──────────── broadcast ──────────── */

  @Post('broadcast')
  @Roles(UserRole.ADMIN)
  @UsePipes(new ZodValidationPipe(broadcastSchema))
  broadcast(@Body() body: BroadcastInput, @Req() req: FastifyRequest) {
    return this.service.broadcast(body, AuditLogService.fromRequest(req));
  }

  /* ──────────── audit log ──────────── */

  @Get('audit')
  audit_list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('target') target?: string,
  ) {
    return this.audit.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      actorId,
      action,
      target,
    });
  }
}
