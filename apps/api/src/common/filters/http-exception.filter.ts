import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as { message?: string | string[] }).message;

    const errorMessage = Array.isArray(message)
      ? message.join(', ')
      : (message ?? exception.message);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception.stack);
    }

    response.status(status).send({
      success: false,
      error: errorMessage,
      statusCode: status,
      timestamp: new Date().toISOString(),
    });
  }
}
