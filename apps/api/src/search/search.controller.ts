import { Body, Controller, Delete, Get, Param, Post, Query, UsePipes } from '@nestjs/common';
import {
  searchAlertCreateSchema,
  searchSchema,
  searchSuggestionsSchema,
  type SearchAlertCreateInput,
  type SearchInput,
  type SearchSuggestionsInput,
} from '@agahiram/shared';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Public()
  @Get()
  @UsePipes(new ZodValidationPipe(searchSchema))
  search(@Query() query: SearchInput, @CurrentUser('sub') viewerId?: string) {
    return this.service.search(query, viewerId);
  }

  @Public()
  @Get('suggestions')
  @UsePipes(new ZodValidationPipe(searchSuggestionsSchema))
  suggestions(@Query() query: SearchSuggestionsInput) {
    return this.service.suggestions(query);
  }

  @Get('alerts')
  listAlerts(@CurrentUser('sub') userId: string) {
    return this.service.listAlerts(userId);
  }

  @Post('alerts')
  @UsePipes(new ZodValidationPipe(searchAlertCreateSchema))
  createAlert(@CurrentUser('sub') userId: string, @Body() body: SearchAlertCreateInput) {
    return this.service.createAlert(userId, body);
  }

  @Delete('alerts/:id')
  deleteAlert(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.service.deactivateAlert(userId, id);
  }
}
