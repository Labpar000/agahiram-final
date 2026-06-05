import { Body, Controller, Post, UseGuards, UsePipes } from '@nestjs/common';
import {
  aiSuggestCategorySchema,
  aiSuggestPriceSchema,
  type AiSuggestCategoryInput,
  type AiSuggestPriceInput,
} from '@agahiram/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AiService } from './ai.service';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly service: AiService) {}

  @Post('suggest-category')
  @UsePipes(new ZodValidationPipe(aiSuggestCategorySchema))
  suggestCategory(@Body() body: AiSuggestCategoryInput) {
    return this.service.suggestCategory(body.text);
  }

  @Post('suggest-price')
  @UsePipes(new ZodValidationPipe(aiSuggestPriceSchema))
  suggestPrice(@Body() body: AiSuggestPriceInput) {
    return this.service.suggestPrice(body.categoryId, body.attributes);
  }
}
