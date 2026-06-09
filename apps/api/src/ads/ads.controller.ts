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
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { UserRole } from '@agahiram/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AdsService } from './ads.service';

@Controller('ads')
export class AdsController {
  constructor(private readonly ads: AdsService) {}

  /* ──────────── Public ad serving ──────────── */

  @Public()
  @Get('serve')
  serve(
    @Query('slot') slot: string,
    @Query('cityId') cityId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ads.serveAds(slot, cityId, categoryId, limit ? Number(limit) : 1);
  }

  @Public()
  @Post('impression/:id')
  recordImpression(
    @Param('id') id: string,
    @Body('userId') userId?: string,
    @Body('source') source?: string,
  ) {
    void this.ads.recordImpression(id, userId, source);
    return { ok: true };
  }

  /* ──────────── Click tracking ──────────── */

  @Public()
  @Get('click/:id')
  async click(@Param('id') id: string, @Query('uid') userId?: string, @Req() req?: FastifyRequest) {
    const fwd = (req?.headers?.['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
    const ua = req?.headers?.['user-agent'] as string | undefined;
    await this.ads.recordClick(id, userId, fwd ?? req?.ip, ua);
    const ad = await this.ads.getAd(id);
    const redirectUrl = (ad as any).redirectUrl;
    if (redirectUrl) {
      return { redirect: redirectUrl };
    }
    return { ok: true };
  }

  /* ──────────── Admin campaign management ──────────── */

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Get('admin/campaigns')
  adminCampaigns(
    @Query('advertiserId') advertiserId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ads.getCampaigns({
      advertiserId,
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Get('admin/campaigns/:id')
  adminCampaign(@Param('id') id: string) {
    return this.ads.getCampaign(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Patch('admin/campaigns/:id')
  adminUpdateCampaign(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.ads.updateCampaign(id, body as any);
  }

  /* ──────────── Admin ad management ──────────── */

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Get('admin/ads')
  adminAds(
    @Query('campaignId') campaignId?: string,
    @Query('status') status?: string,
    @Query('slot') slot?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ads.listAds({
      campaignId,
      status,
      slot,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Get('admin/ads/:id')
  adminAd(@Param('id') id: string) {
    return this.ads.getAd(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Post('admin/ads/:id/review')
  adminReviewAd(
    @Param('id') id: string,
    @CurrentUser('sub') adminId: string,
    @Body('action') action: 'approve' | 'reject',
    @Body('note') note?: string,
  ) {
    return this.ads.reviewAd(adminId, id, action, note);
  }

  /* ──────────── Pending review ──────────── */

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Get('admin/pending')
  adminPending(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.ads.listPendingAds({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  /* ──────────── Stats ──────────── */

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Get('admin/stats')
  adminStats() {
    return this.ads.stats();
  }
}
