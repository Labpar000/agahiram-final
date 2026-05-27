import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
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
  boostPlanUpsertSchema,
  categoryAttributeUpsertSchema,
  categoryUpsertSchema,
  cityUpsertSchema,
  neighborhoodUpsertSchema,
  provinceUpsertSchema,
  UserRole,
  type BoostPlanUpsertInput,
  type CategoryAttributeUpsertInput,
  type CategoryUpsertInput,
  type CityUpsertInput,
  type NeighborhoodUpsertInput,
  type ProvinceUpsertInput,
} from '@agahiram/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from './audit-log.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminContentController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  /* ──────────── categories ──────────── */

  @Get('categories')
  async listCategories() {
    const all = await this.prisma.category.findMany({
      include: {
        attributes: { orderBy: { order: 'asc' } },
        _count: { select: { posts: true } },
      },
      orderBy: { order: 'asc' },
    });
    return all;
  }

  @Post('categories')
  @UsePipes(new ZodValidationPipe(categoryUpsertSchema))
  async createCategory(@Body() body: CategoryUpsertInput, @Req() req: FastifyRequest) {
    const cat = await this.prisma.category.create({ data: body });
    await this.audit.record(
      AuditLogService.fromRequest(req),
      'category.create',
      `category:${cat.id}`,
      body as never,
    );
    return cat;
  }

  @Patch('categories/:id')
  @UsePipes(new ZodValidationPipe(categoryUpsertSchema.partial()))
  async updateCategory(
    @Param('id') id: string,
    @Body() body: Partial<CategoryUpsertInput>,
    @Req() req: FastifyRequest,
  ) {
    const cat = await this.prisma.category.update({ where: { id }, data: body });
    await this.audit.record(
      AuditLogService.fromRequest(req),
      'category.update',
      `category:${id}`,
      body as never,
    );
    return cat;
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string, @Req() req: FastifyRequest) {
    const inUse = await this.prisma.post.count({ where: { categoryId: id } });
    if (inUse > 0) {
      throw new BadRequestException(
        `این دسته در ${inUse} آگهی استفاده شده است؛ ابتدا آن‌ها را منتقل کنید.`,
      );
    }
    await this.prisma.category.delete({ where: { id } });
    await this.audit.record(AuditLogService.fromRequest(req), 'category.delete', `category:${id}`);
    return { ok: true };
  }

  @Post('categories/:id/attributes')
  @UsePipes(new ZodValidationPipe(categoryAttributeUpsertSchema))
  async createAttribute(
    @Param('id') categoryId: string,
    @Body() body: CategoryAttributeUpsertInput,
    @Req() req: FastifyRequest,
  ) {
    const cat = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) throw new NotFoundException('دسته یافت نشد');
    const attr = await this.prisma.categoryAttribute.create({
      data: { ...body, categoryId },
    });
    await this.audit.record(
      AuditLogService.fromRequest(req),
      'category.attribute.create',
      `category:${categoryId}`,
      body as never,
    );
    return attr;
  }

  @Patch('attributes/:id')
  @UsePipes(new ZodValidationPipe(categoryAttributeUpsertSchema.partial()))
  async updateAttribute(
    @Param('id') id: string,
    @Body() body: Partial<CategoryAttributeUpsertInput>,
    @Req() req: FastifyRequest,
  ) {
    const attr = await this.prisma.categoryAttribute.update({ where: { id }, data: body });
    await this.audit.record(
      AuditLogService.fromRequest(req),
      'category.attribute.update',
      `attribute:${id}`,
      body as never,
    );
    return attr;
  }

  @Delete('attributes/:id')
  async deleteAttribute(@Param('id') id: string, @Req() req: FastifyRequest) {
    await this.prisma.categoryAttribute.delete({ where: { id } });
    await this.audit.record(
      AuditLogService.fromRequest(req),
      'category.attribute.delete',
      `attribute:${id}`,
    );
    return { ok: true };
  }

  /* ──────────── provinces ──────────── */

  @Get('provinces')
  async listProvinces() {
    return this.prisma.province.findMany({
      include: { _count: { select: { cities: true } } },
      orderBy: { name: 'asc' },
    });
  }

  @Post('provinces')
  @UsePipes(new ZodValidationPipe(provinceUpsertSchema))
  async createProvince(@Body() body: ProvinceUpsertInput, @Req() req: FastifyRequest) {
    const p = await this.prisma.province.create({ data: body });
    await this.audit.record(
      AuditLogService.fromRequest(req),
      'province.create',
      `province:${p.id}`,
      body as never,
    );
    return p;
  }

  @Patch('provinces/:id')
  @UsePipes(new ZodValidationPipe(provinceUpsertSchema.partial()))
  async updateProvince(
    @Param('id') id: string,
    @Body() body: Partial<ProvinceUpsertInput>,
    @Req() req: FastifyRequest,
  ) {
    const p = await this.prisma.province.update({ where: { id }, data: body });
    await this.audit.record(
      AuditLogService.fromRequest(req),
      'province.update',
      `province:${id}`,
      body as never,
    );
    return p;
  }

  @Delete('provinces/:id')
  async deleteProvince(@Param('id') id: string, @Req() req: FastifyRequest) {
    const cities = await this.prisma.city.count({ where: { provinceId: id } });
    if (cities > 0) throw new BadRequestException('ابتدا شهرهای این استان را حذف کنید.');
    await this.prisma.province.delete({ where: { id } });
    await this.audit.record(AuditLogService.fromRequest(req), 'province.delete', `province:${id}`);
    return { ok: true };
  }

  /* ──────────── cities ──────────── */

  @Get('cities')
  async listCities(@Query('provinceId') provinceId?: string, @Query('q') q?: string) {
    return this.prisma.city.findMany({
      where: {
        ...(provinceId ? { provinceId } : {}),
        ...(q ? { name: { contains: q } } : {}),
      },
      include: {
        province: { select: { name: true } },
        _count: { select: { posts: true } },
      },
      orderBy: { name: 'asc' },
      take: 500,
    });
  }

  @Post('cities')
  @UsePipes(new ZodValidationPipe(cityUpsertSchema))
  async createCity(@Body() body: CityUpsertInput, @Req() req: FastifyRequest) {
    const c = await this.prisma.city.create({ data: body });
    await this.audit.record(
      AuditLogService.fromRequest(req),
      'city.create',
      `city:${c.id}`,
      body as never,
    );
    return c;
  }

  @Patch('cities/:id')
  @UsePipes(new ZodValidationPipe(cityUpsertSchema.partial()))
  async updateCity(
    @Param('id') id: string,
    @Body() body: Partial<CityUpsertInput>,
    @Req() req: FastifyRequest,
  ) {
    const c = await this.prisma.city.update({ where: { id }, data: body });
    await this.audit.record(
      AuditLogService.fromRequest(req),
      'city.update',
      `city:${id}`,
      body as never,
    );
    return c;
  }

  @Delete('cities/:id')
  async deleteCity(@Param('id') id: string, @Req() req: FastifyRequest) {
    const used = await this.prisma.post.count({ where: { cityId: id } });
    if (used > 0) throw new BadRequestException('این شهر در آگهی‌های فعال استفاده شده است.');
    await this.prisma.city.delete({ where: { id } });
    await this.audit.record(AuditLogService.fromRequest(req), 'city.delete', `city:${id}`);
    return { ok: true };
  }

  /* ──────────── neighborhoods ──────────── */

  @Get('neighborhoods')
  async listNeighborhoods(@Query('cityId') cityId?: string) {
    if (!cityId) return [];
    return this.prisma.neighborhood.findMany({
      where: { cityId },
      orderBy: { name: 'asc' },
    });
  }

  @Post('neighborhoods')
  @UsePipes(new ZodValidationPipe(neighborhoodUpsertSchema))
  async createNeighborhood(@Body() body: NeighborhoodUpsertInput, @Req() req: FastifyRequest) {
    const n = await this.prisma.neighborhood.create({ data: body });
    await this.audit.record(
      AuditLogService.fromRequest(req),
      'neighborhood.create',
      `neighborhood:${n.id}`,
      body as never,
    );
    return n;
  }

  @Patch('neighborhoods/:id')
  @UsePipes(new ZodValidationPipe(neighborhoodUpsertSchema.partial()))
  async updateNeighborhood(
    @Param('id') id: string,
    @Body() body: Partial<NeighborhoodUpsertInput>,
    @Req() req: FastifyRequest,
  ) {
    const n = await this.prisma.neighborhood.update({ where: { id }, data: body });
    await this.audit.record(
      AuditLogService.fromRequest(req),
      'neighborhood.update',
      `neighborhood:${id}`,
      body as never,
    );
    return n;
  }

  @Delete('neighborhoods/:id')
  async deleteNeighborhood(@Param('id') id: string, @Req() req: FastifyRequest) {
    await this.prisma.neighborhood.delete({ where: { id } });
    await this.audit.record(
      AuditLogService.fromRequest(req),
      'neighborhood.delete',
      `neighborhood:${id}`,
    );
    return { ok: true };
  }

  /* ──────────── boost plans ──────────── */

  @Get('boost-plans')
  async listBoostPlans() {
    return this.prisma.boostPlan.findMany({
      include: { _count: { select: { payments: true } } },
      orderBy: { price: 'asc' },
    });
  }

  @Post('boost-plans')
  @UsePipes(new ZodValidationPipe(boostPlanUpsertSchema))
  async createBoostPlan(@Body() body: BoostPlanUpsertInput, @Req() req: FastifyRequest) {
    const plan = await this.prisma.boostPlan.create({
      data: { ...body, price: BigInt(body.price) },
    });
    await this.audit.record(
      AuditLogService.fromRequest(req),
      'boostPlan.create',
      `boostPlan:${plan.id}`,
      body as never,
    );
    return plan;
  }

  @Patch('boost-plans/:id')
  @UsePipes(new ZodValidationPipe(boostPlanUpsertSchema.partial()))
  async updateBoostPlan(
    @Param('id') id: string,
    @Body() body: Partial<BoostPlanUpsertInput>,
    @Req() req: FastifyRequest,
  ) {
    const data: Record<string, unknown> = { ...body };
    if (body.price !== undefined) data.price = BigInt(body.price);
    const plan = await this.prisma.boostPlan.update({ where: { id }, data: data as never });
    await this.audit.record(
      AuditLogService.fromRequest(req),
      'boostPlan.update',
      `boostPlan:${id}`,
      body as never,
    );
    return plan;
  }

  @Delete('boost-plans/:id')
  async deleteBoostPlan(@Param('id') id: string, @Req() req: FastifyRequest) {
    const used = await this.prisma.payment.count({ where: { planId: id } });
    if (used > 0) {
      /* Don't actually delete; just deactivate so payment history remains valid. */
      const plan = await this.prisma.boostPlan.update({
        where: { id },
        data: { isActive: false },
      });
      await this.audit.record(
        AuditLogService.fromRequest(req),
        'boostPlan.deactivate',
        `boostPlan:${id}`,
      );
      return plan;
    }
    await this.prisma.boostPlan.delete({ where: { id } });
    await this.audit.record(
      AuditLogService.fromRequest(req),
      'boostPlan.delete',
      `boostPlan:${id}`,
    );
    return { ok: true };
  }
}
