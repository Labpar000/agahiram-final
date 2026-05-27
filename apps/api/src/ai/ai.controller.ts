import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiService } from './ai.service';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly service: AiService) {}

  @Post('suggest-category')
  suggestCategory(@Body() body: { text: string }) {
    return this.service.suggestCategory(body.text);
  }

  @Post('suggest-price')
  suggestPrice(@Body() body: { categoryId: string; attributes: Record<string, string> }) {
    return this.service.suggestPrice(body.categoryId, body.attributes);
  }
}
