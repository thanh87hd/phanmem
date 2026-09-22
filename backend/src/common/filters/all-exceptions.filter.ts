import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const isProd = process.env.NODE_ENV === 'production';
    const correlationId = (request.headers['x-correlation-id'] as string) || undefined;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object =
      'Đã xảy ra lỗi máy chủ nội bộ (Internal Server Error)';
    let errorDetail: any = undefined;

    // Check for TypeORM OptimisticLockVersionMismatchError (Concurrency conflict)
    if (
      exception &&
      typeof exception === 'object' &&
      (exception as any).name === 'OptimisticLockVersionMismatchError'
    ) {
      status = HttpStatus.CONFLICT; // 409
      message =
        'Hồ sơ này vừa được một người dùng khác cập nhật. Vui lòng tải lại dữ liệu để lấy phiên bản mới nhất trước khi chỉnh sửa tiếp.';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        message =
          (res as any).message || (res as any).error || exception.message;
        errorDetail = (res as any).error;
      } else {
        message = res;
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `[UnhandledException][${correlationId || 'no-trace'}] ${request.method} ${request.url} - ${exception.message}`,
        exception.stack,
      );

      // In production, mask internal error details to prevent information disclosure
      if (!isProd) {
        message = exception.message;
        errorDetail = exception.stack;
      }
    }

    const responseBody = {
      statusCode: status,
      correlationId,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      ...(errorDetail && !isProd ? { detail: errorDetail } : {}),
    };

    response.status(status).send(responseBody);
  }
}
