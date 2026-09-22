import { ExecutionContext, CallHandler } from '@nestjs/common';
import {
  FileInterceptor,
  FilesInterceptor,
  FastifyMulterModule,
} from './fastify-file-interceptor';
import { of } from 'rxjs';

describe('FastifyFileInterceptor', () => {
  describe('FileInterceptor', () => {
    it('should extract a single file and populate standard properties including size', async () => {
      // Arrange
      const InterceptorClass = FileInterceptor('file');
      const interceptor = new InterceptorClass();

      const mockBuffer = Buffer.from('hello world'); // length 11
      const req = {
        body: {
          file: {
            filename: 'test.txt',
            encoding: '7bit',
            mimetype: 'text/plain',
            _buf: mockBuffer,
          },
          otherField: 'data',
        },
      } as any;

      const context = {
        switchToHttp: () => ({ getRequest: () => req }),
      } as ExecutionContext;

      const next = { handle: () => of('next called') } as CallHandler;

      // Act
      await interceptor.intercept(context, next);

      // Assert
      expect(req.file).toBeDefined();
      expect(req.file.originalname).toBe('test.txt');
      expect(req.file.buffer).toBe(mockBuffer);
      expect(req.file.size).toBe(11); // TDD Prove-It Pattern: This should fail in RED phase!
      expect(req.body.file).toBeUndefined(); // ensure raw file is removed
      expect(req.body.otherField).toBe('data'); // ensure other fields are untouched
    });

    it('should handle missing body gracefully', async () => {
      const InterceptorClass = FileInterceptor('file');
      const interceptor = new InterceptorClass();

      const req = {} as any; // No body
      const context = {
        switchToHttp: () => ({ getRequest: () => req }),
      } as ExecutionContext;
      const next = { handle: () => of('next called') } as CallHandler;

      await interceptor.intercept(context, next);

      expect(req.file).toBeUndefined();
      expect(req.body).toEqual({});
    });
  });

  describe('FilesInterceptor', () => {
    it('should extract multiple files into req.files', async () => {
      const InterceptorClass = FilesInterceptor('files');
      const interceptor = new InterceptorClass();

      const req = {
        body: {
          files: [
            { filename: '1.txt', _buf: Buffer.from('1') },
            { filename: '2.txt', _buf: Buffer.from('22') },
          ],
        },
      } as any;

      const context = {
        switchToHttp: () => ({ getRequest: () => req }),
      } as any;
      const next = { handle: () => of(true) } as any;

      await interceptor.intercept(context, next);

      expect(req.files).toHaveLength(2);
      expect(req.files[0].originalname).toBe('1.txt');
      expect(req.files[1].size).toBe(2);
      expect(req.body.files).toBeUndefined();
    });
  });

  describe('FastifyMulterModule', () => {
    it('should return a valid dynamic module', () => {
      const module = FastifyMulterModule.register();
      expect(module.module).toBe(FastifyMulterModule);
    });
  });
});
