import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditTrailService } from './audit-trail.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditTrailService: AuditTrailService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest();
    const { method, url, body, ip, headers, user } = req;

    // Only log write operations
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    let action: 'CREATE' | 'UPDATE' | 'DELETE' = 'UPDATE';
    if (method === 'POST') action = 'CREATE';
    if (method === 'DELETE') action = 'DELETE';

    const userAgent = headers['user-agent'] || '';
    const userId = user?.userId || null;
    const username = user?.username || 'Guest';

    // Parse resource name from URL (e.g. /api/users -> users)
    const resource = url.split('/')[1] || 'Unknown';
    const resourceId = req.params?.id || null;

    return next.handle().pipe(
      tap({
        next: (responseBody: any) => {
          // Log success
          this.auditTrailService
            .log({
              action,
              resource,
              resourceId,
              userId,
              username,
              newValue: body,
              ipAddress: ip,
              userAgent,
            })
            .catch((err) => console.error('Failed to log audit trail:', err));
        },
        error: (err: any) => {
          // Log failure? Optionally log failed actions as well
        },
      }),
    );
  }
}
