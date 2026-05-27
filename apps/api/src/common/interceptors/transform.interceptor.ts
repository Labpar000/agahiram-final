import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

// Recursively converts BigInt values to strings so JSON.stringify doesn't throw.
// We use string (not number) to avoid silent precision loss for amounts > 2^53.
function serializeBigInts(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(serializeBigInts);
  if (value instanceof Date) return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = serializeBigInts(v);
  }
  return out;
}

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        const safe = serializeBigInts(data);
        if (safe && typeof safe === 'object' && 'success' in safe) {
          return safe;
        }
        return { success: true, data: safe };
      }),
    );
  }
}
