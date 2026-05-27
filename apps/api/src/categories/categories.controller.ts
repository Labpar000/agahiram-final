import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { CategoriesService } from './categories.service';

@Public()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get('tree')
  tree() {
    return this.service.getTree();
  }

  @Get('slug/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.service.getBySlug(slug);
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.service.getById(id);
  }
}
