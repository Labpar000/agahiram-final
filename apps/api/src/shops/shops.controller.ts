import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  createShopSchema,
  updateShopSchema,
  type CreateShopInput,
  type UpdateShopInput,
} from '@agahiram/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ShopsService } from './shops.service';

@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UsePipes(new ZodValidationPipe(createShopSchema))
  create(@CurrentUser('sub') userId: string, @Body() body: CreateShopInput) {
    return this.shopsService.createShop(userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyShop(@CurrentUser('sub') userId: string) {
    return this.shopsService.getMyShop(userId);
  }

  @Public()
  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.shopsService.getShopBySlug(slug);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':slug')
  update(
    @CurrentUser('sub') userId: string,
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(updateShopSchema)) body: UpdateShopInput,
  ) {
    return this.shopsService.updateShop(userId, slug, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.shopsService.deleteShop(userId, id);
  }

  @Public()
  @Get(':slug/posts')
  getPosts(
    @Param('slug') slug: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.shopsService.getShopPosts(
      slug,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Public()
  @Get(':slug/trust')
  getTrust(@Param('slug') slug: string) {
    return this.shopsService.getShopTrust(slug);
  }
}
