import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { Prisma } from '@agahiram/database';

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'خطای پایگاه داده';

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'این مقدار قبلاً ثبت شده است';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'موردی یافت نشد';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'ارتباط نامعتبر';
          break;
        default:
          this.logger.error(`Prisma error ${exception.code}: ${exception.message}`);
      }
    } else {
      this.logger.error(exception.message);
      status = HttpStatus.BAD_REQUEST;
      message = 'داده‌های نامعتبر';
    }

    response.status(status).send({
      success: false,
      error: message,
      statusCode: status,
      timestamp: new Date().toISOString(),
    });
  }
}
