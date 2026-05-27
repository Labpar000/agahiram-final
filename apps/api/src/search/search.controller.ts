import { Controller, Get, Query, UsePipes } from '@nestjs/common';
import { searchSchema, type SearchInput } from '@agahiram/shared';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SearchService } from './search.service';

@Public()
@Controller('search')
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Get()
  @UsePipes(new ZodValidationPipe(searchSchema))
  search(@Query() query: SearchInput) {
    return this.service.search(query);
  }
}
