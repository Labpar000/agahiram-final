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
  UserRole,
  adAnalyticsQuerySchema,
  adImpressionSchema,
  adReportSchema,
  adServeSchema,
  createAdSchema,
  createCampaignSchema,
  createMyCampaignSchema,
  reviewAdSchema,
  updateAdSchema,
  updateCampaignSchema,
  updateMyAdSchema,
  updateMyCampaignSchema,
  type AdAnalyticsQueryInput,
  type AdImpressionInput,
  type AdReportInput,
  type AdServeInput,
  type CreateAdInput,
  type CreateCampaignInput,
  type CreateMyCampaignInput,
  type ReviewAdInput,
  type UpdateAdInput,
  type UpdateCampaignInput,
  type UpdateMyAdInput,
  type UpdateMyCampaignInput,
} from '@agahiram/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SettingsService } from '../admin/settings.service';
import { AdsService } from './ads.service';

@Controller('ads')
export class AdsController {
  constructor(
    private readonly ads: AdsService,
    private readonly settings: SettingsService,
  ) {}

  @Public()
  @Get('config')
  config() {
    const s = this.settings.getCached();
    return {
      adsEnabled: s.adsEnabled,
      adsExploreInterval: s.adsExploreInterval,
      adsStoryInterval: s.adsStoryInterval,
    };
  }

  /* ──────────── Public ad serving ──────────── */

  @Public()
  @Get('serve')
  @UsePipes(new ZodValidationPipe(adServeSchema))
  serve(@Query() query: AdServeInput) {
    return this.ads.serveAds(
      query.slot,
      query.cityId,
      query.categoryId,
      query.limit,
      query.sessionId,
    );
  }

  @Public()
  @Post('impression/:id')
  recordImpression(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adImpressionSchema)) body: AdImpressionInput,
  ) {
    void this.ads.recordImpression(id, body.userId, body.source, body.sessionId);
    return { ok: true };
  }

  @Public()
  @Get('click/:id')
  async click(
    @Param('id') id: string,
    @Query('uid') userId?: string,
    @Query('sid') sessionId?: string,
    @Req() req?: FastifyRequest,
  ) {
    const fwd = (req?.headers?.['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
    const ua = req?.headers?.['user-agent'] as string | undefined;
    await this.ads.recordClick(id, userId, fwd ?? req?.ip, ua, sessionId);
    const ad = await this.ads.getAd(id);
    const redirectUrl = this.ads.getClickRedirectUrl(ad);
    if (redirectUrl) {
      return { redirect: redirectUrl };
    }
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/report')
  @UsePipes(new ZodValidationPipe(adReportSchema))
  reportAd(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() body: AdReportInput,
  ) {
    return this.ads.reportAd(userId, id, body.reason, body.details);
  }

  /* ──────────── Advertiser self-service (before parametric :id routes) ──────────── */

  @UseGuards(JwtAuthGuard)
  @Get('my/overview')
  myOverview(@CurrentUser('sub') userId: string) {
    return this.ads.getMyOverview(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my/campaigns')
  myCampaigns(
    @CurrentUser('sub') userId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ads.getCampaigns({
      advertiserId: userId,
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('my/campaigns')
  myCreateCampaign(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createMyCampaignSchema)) body: CreateMyCampaignInput,
  ) {
    return this.ads.createMyCampaign(userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my/campaigns/:id')
  myCampaign(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.ads.getMyCampaign(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('my/campaigns/:id')
  myUpdateCampaign(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(updateMyCampaignSchema)) body: UpdateMyCampaignInput,
  ) {
    return this.ads.updateMyCampaign(userId, id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my/campaigns/:id/analytics')
  @UsePipes(new ZodValidationPipe(adAnalyticsQuerySchema))
  myCampaignAnalytics(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Query() query: AdAnalyticsQueryInput,
  ) {
    return this.ads.getMyCampaignAnalytics(userId, id, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my/ads')
  myAds(
    @CurrentUser('sub') userId: string,
    @Query('campaignId') campaignId?: string,
    @Query('status') status?: string,
    @Query('slot') slot?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ads.listMyAds(userId, {
      campaignId,
      status,
      slot,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('my/ads')
  myCreateAd(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createAdSchema)) body: CreateAdInput,
  ) {
    return this.ads.createMyAd(userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my/ads/:id')
  myAd(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.ads.getMyAd(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my/ads/:id/analytics')
  @UsePipes(new ZodValidationPipe(adAnalyticsQuerySchema))
  myAdAnalytics(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Query() query: AdAnalyticsQueryInput,
  ) {
    return this.ads.getMyAdAnalytics(userId, id, query);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('my/ads/:id')
  myUpdateAd(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(updateMyAdSchema)) body: UpdateMyAdInput,
  ) {
    return this.ads.updateMyAd(userId, id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('my/ads/:id')
  myDeleteAd(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.ads.deleteMyAd(userId, id);
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
  @Get('admin/campaigns/:id/analytics')
  @UsePipes(new ZodValidationPipe(adAnalyticsQuerySchema))
  campaignAnalytics(@Param('id') id: string, @Query() query: AdAnalyticsQueryInput) {
    return this.ads.campaignAnalytics(id, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Patch('admin/campaigns/:id')
  adminUpdateCampaign(
    @Param('id') id: string,
    @CurrentUser('sub') adminId: string,
    @CurrentUser('role') role: string,
    @Body(new ZodValidationPipe(updateCampaignSchema)) body: UpdateCampaignInput,
  ) {
    return this.ads.updateCampaign(adminId, id, body, role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Post('admin/campaigns')
  adminCreateCampaign(
    @CurrentUser('sub') adminId: string,
    @CurrentUser('role') role: string,
    @Body(new ZodValidationPipe(createCampaignSchema)) body: CreateCampaignInput,
  ) {
    return this.ads.createCampaign(adminId, body, role);
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
  @Get('admin/ads/:id/analytics')
  @UsePipes(new ZodValidationPipe(adAnalyticsQuerySchema))
  adAnalytics(@Param('id') id: string, @Query() query: AdAnalyticsQueryInput) {
    return this.ads.adAnalytics(id, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Post('admin/ads')
  adminCreateAd(
    @CurrentUser('sub') adminId: string,
    @CurrentUser('role') role: string,
    @Body(new ZodValidationPipe(createAdSchema)) body: CreateAdInput,
  ) {
    return this.ads.createAd(adminId, body, role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Patch('admin/ads/:id')
  adminUpdateAd(
    @Param('id') id: string,
    @CurrentUser('sub') adminId: string,
    @CurrentUser('role') role: string,
    @Body(new ZodValidationPipe(updateAdSchema)) body: UpdateAdInput,
  ) {
    return this.ads.updateAd(adminId, id, body, role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Delete('admin/ads/:id')
  adminDeleteAd(
    @Param('id') id: string,
    @CurrentUser('sub') adminId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.ads.deleteAd(adminId, id, role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Post('admin/ads/:id/review')
  adminReviewAd(
    @Param('id') id: string,
    @CurrentUser('sub') adminId: string,
    @CurrentUser('role') role: string,
    @Body(new ZodValidationPipe(reviewAdSchema)) body: ReviewAdInput,
  ) {
    return this.ads.reviewAd(adminId, id, body, role);
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
  @UsePipes(new ZodValidationPipe(adAnalyticsQuerySchema))
  adminStats(@Query() query: AdAnalyticsQueryInput) {
    return this.ads.stats(query);
  }
}
