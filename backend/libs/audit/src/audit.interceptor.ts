import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { catchError, tap } from 'rxjs/operators';
import type { RequestWithUser } from '@eims/auth';
import { AuditService } from './audit.service';

const AUDITABLE_PREFIXES = [
  '/roles',
  '/permissions',
  '/user',
  '/portal/admin',
  '/oauth2/clients',
  '/oauth2/bindings',
];

/** Record administrative mutations without persisting request bodies. */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (!this.isAuditable(request)) return next.handle();

    const path = request.path.slice(0, 200);
    const user = request.user;
    const baseRecord = {
      event: 'admin.mutation',
      userId: user?.sub,
      userName: user?.userName,
      request: request as Request,
      detail: { method: request.method, path },
    };

    return next.handle().pipe(
      tap(() => {
        void this.auditService.record(baseRecord);
      }),
      catchError((error: unknown) => {
        void this.auditService.record({
          ...baseRecord,
          result: 'failure',
          detail: {
            method: request.method,
            path,
            reason: error instanceof Error ? error.name : 'error',
          },
        });
        throw error;
      }),
    );
  }

  private isAuditable(request: Request) {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      return false;
    }
    return AUDITABLE_PREFIXES.some(
      prefix => request.path === prefix || request.path.startsWith(`${prefix}/`),
    );
  }
}
