import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { AuditTrailService, LogActionParams } from './audit-trail.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);
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

    // Tên tài nguyên = đoạn đường dẫn ĐẦU TIÊN sau khi bỏ tiền tố global 'api'
    // (main.ts: app.setGlobalPrefix('api')).
    //   '/api/users'        -> 'users'
    //   '/api/audit-findings/123' -> 'audit-findings'
    //   '/api' | '/'        -> 'Unknown'
    // Bỏ query string và các đoạn rỗng (dấu '/' thừa) để kết quả tất định.
    const resource = this.parseResource(url);
    // Một số route dùng ':reqId' (vd. yêu cầu thay đổi của cuộc kiểm toán) thay vì ':id'.
    const resourceId = req.params?.id ?? req.params?.reqId ?? null;

    const auditParams: LogActionParams = {
      action,
      resource,
      resourceId,
      userId,
      username,
      newValue: body,
      ipAddress: ip,
      userAgent,
    };

    // Ghi nhật ký TRƯỚC khi phát response về client (mergeMap + await) để không mất bản
    // ghi khi tiến trình chết ngay sau khi trả lời; lỗi ghi log vẫn không làm hỏng request.
    return next.handle().pipe(
      mergeMap(async (responseBody: any) => {
        // Bản ghi phản ánh yêu cầu (body) chứ không phải body phản hồi của handler.
        try {
          await this.auditTrailService.log(auditParams);
        } catch (err) {
          this.logger.error('Failed to log audit trail:', err);
        }
        return responseBody;
      }),
    );
  }

  /** Lấy tên tài nguyên từ URL, bỏ tiền tố 'api', query string và đoạn rỗng. */
  private parseResource(url: string): string {
    const path = (url || '').split('?')[0].split('#')[0];
    const segments = path.split('/').filter((segment) => segment.length > 0);
    if (segments[0] === 'api') {
      segments.shift();
    }
    return segments[0] || 'Unknown';
  }
}
