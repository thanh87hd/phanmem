import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  mixin,
  Type,
  DynamicModule,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { validateFileMagicBytes } from '../utils/file-signature.util';

export interface FastifyUploadedFile {
  fieldname?: string;
  originalname: string;
  encoding?: string;
  mimetype: string;
  buffer: Buffer;
  size?: number;
}

// Dummy Multer module and storage for compatibility
export class FastifyMulterModule {
  static register(options?: any): DynamicModule {
    return { module: FastifyMulterModule };
  }
}
export const memoryStorage = () => ({});
export const diskStorage = (options?: any) => ({});

export function FileInterceptor(
  fieldName: string,
  localOptions?: any,
): Type<NestInterceptor> {
  @Injectable()
  class MixinFileInterceptor implements NestInterceptor {
    async intercept(context: ExecutionContext, next: CallHandler) {
      const req = context.switchToHttp().getRequest<FastifyRequest>();

      if (!req.body) {
        req.body = {};
      }

      if (req.body && (req.body as any)[fieldName]) {
        const fileData = (req.body as any)[fieldName];
        const file = Array.isArray(fileData) ? fileData[0] : fileData;

        if (file) {
          const buffer =
            file._buf ||
            file.data ||
            (file.toBuffer ? await file.toBuffer() : file);

          // Validate Magic Bytes against disguised executables
          const signature = validateFileMagicBytes(
            buffer,
            file.filename,
            file.mimetype,
          );

          (req as any).file = {
            fieldname: fieldName,
            originalname: file.filename,
            encoding: file.encoding,
            mimetype: signature.detectedType || file.mimetype,
            buffer: buffer,
            size: buffer.length,
          };
          // Remove the raw file array/object from body so it doesn't break validation
          delete (req.body as any)[fieldName];
        }
      }
      return next.handle();
    }
  }
  return mixin(MixinFileInterceptor);
}

export function FilesInterceptor(
  fieldName: string,
  maxCount?: number,
  localOptions?: any,
): Type<NestInterceptor> {
  @Injectable()
  class MixinFilesInterceptor implements NestInterceptor {
    async intercept(context: ExecutionContext, next: CallHandler) {
      const req = context.switchToHttp().getRequest<FastifyRequest>();

      if (!req.body) {
        req.body = {};
      }

      if (req.body && (req.body as any)[fieldName]) {
        let fileData = (req.body as any)[fieldName];
        if (!Array.isArray(fileData)) fileData = [fileData];

        (req as any).files = [];
        for (const file of fileData) {
          const buffer =
            file._buf ||
            file.data ||
            (file.toBuffer ? await file.toBuffer() : file);

          // Validate Magic Bytes
          const signature = validateFileMagicBytes(
            buffer,
            file.filename,
            file.mimetype,
          );

          (req as any).files.push({
            fieldname: fieldName,
            originalname: file.filename,
            encoding: file.encoding,
            mimetype: signature.detectedType || file.mimetype,
            buffer: buffer,
            size: buffer.length,
          });
        }
        delete (req.body as any)[fieldName];
      }
      return next.handle();
    }
  }
  return mixin(MixinFilesInterceptor);
}
