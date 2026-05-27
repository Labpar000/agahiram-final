import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown, metadata: ArgumentMetadata): T {
    /* `@UsePipes()` at method level runs against every decorated param. Skip
     * non-body params (e.g. `@Param('id')`, `@Query()`, `@Req()`) so a single
     * pipe declaration only validates the request body. */
    if (metadata.type && metadata.type !== 'body') {
      return value as T;
    }
    try {
      return this.schema.parse(value);
    } catch (e) {
      if (e instanceof ZodError) {
        const msg = e.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join('; ');
        throw new BadRequestException(msg);
      }
      throw new BadRequestException('داده‌ی نامعتبر');
    }
  }
}
