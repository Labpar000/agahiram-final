import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { catchError, Observable, tap, throwError } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const elapsed = Date.now() - start;
        this.logger.log(`${method} ${url} ${elapsed}ms`);
      }),
      catchError((err) => {
        const elapsed = Date.now() - start;
        const status = err?.status ?? err?.statusCode ?? 500;
        this.logger.warn(`${method} ${url} ${status} ${elapsed}ms - ${err?.message ?? 'error'}`);
        return throwError(() => err);
      }),
    );
  }
}
