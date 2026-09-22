import { BadRequestException } from '@nestjs/common';
import {
  diskStorage,
  memoryStorage,
} from '../../common/interceptors/fastify-file-interceptor';

import * as os from 'os';
export const MAX_EXCEL_UPLOAD_SIZE = 5 * 1024 * 1024;
export const MAX_DOCUMENT_UPLOAD_SIZE = 20 * 1024 * 1024;

const EXCEL_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
]);

const DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'text/markdown',
  'image/jpeg',
  'image/png',
]);

const EVIDENCE_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

function hasAllowedExtension(fileName: string, extensions: string[]) {
  const lowerName = fileName.toLowerCase();
  return extensions.some((extension) => lowerName.endsWith(extension));
}

function createFileFilter(
  allowedMimeTypes: Set<string>,
  allowedExtensions: string[],
  errorMessage: string,
): any['fileFilter'] {
  return (_req: any, file: any, cb: any) => {
    if (
      allowedMimeTypes.has(file.mimetype) &&
      hasAllowedExtension(file.originalname, allowedExtensions)
    ) {
      cb(null, true);
      return;
    }

    cb(new BadRequestException(errorMessage));
  };
}

export const excelUploadOptions: any = {
  storage: diskStorage({ destination: os.tmpdir() }),
  limits: {
    fileSize: MAX_EXCEL_UPLOAD_SIZE,
    files: 5,
    fields: 20,
  },
  fileFilter: createFileFilter(
    EXCEL_MIME_TYPES,
    ['.xlsx', '.xls', '.csv'],
    'Chi chap nhan file Excel/CSV hop le, toi da 5MB.',
  ),
};

export const documentUploadOptions: any = {
  storage: memoryStorage(),
  limits: {
    fileSize: MAX_DOCUMENT_UPLOAD_SIZE,
    files: 5,
    fields: 20,
  },
  fileFilter: createFileFilter(
    DOCUMENT_MIME_TYPES,
    [
      '.pdf',
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
      '.csv',
      '.txt',
      '.md',
      '.jpg',
      '.jpeg',
      '.png',
    ],
    'Chi chap nhan file tai lieu hop le, toi da 20MB.',
  ),
};

export const evidenceUploadOptions: any = {
  storage: diskStorage({ destination: os.tmpdir() }),
  limits: {
    fileSize: MAX_DOCUMENT_UPLOAD_SIZE,
    files: 10,
    fields: 20,
  },
  fileFilter: createFileFilter(
    EVIDENCE_MIME_TYPES,
    [
      '.pdf',
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
    ],
    'Loai file khong duoc ho tro. Chi chap nhan PDF, Word, Excel va hinh anh.',
  ),
};
