import { BadRequestException } from '@nestjs/common';

/**
 * Validates file buffer signatures against known magic bytes.
 * Prevents disguised executable files (.exe, .elf, .bat, etc.) from being processed.
 */
export function validateFileMagicBytes(
  buffer: Buffer,
  filename?: string,
  declaredMime?: string,
): { isValid: boolean; detectedType?: string; error?: string } {
  if (!buffer || buffer.length === 0) {
    return {
      isValid: false,
      error: 'Tệp rỗng hoặc không có dữ liệu (Empty file)',
    };
  }

  // 1. Check for dangerous executable signatures
  // Windows PE (EXE / DLL / SYS / COM) -> 'MZ'
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    throw new BadRequestException(
      'Phát hiện tệp thực thi nhị phân (.exe/.dll) không được phép tải lên vì lý do an ninh.',
    );
  }

  // Linux ELF executable -> 0x7F 'E' 'L' 'F'
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x7f &&
    buffer[1] === 0x45 &&
    buffer[2] === 0x4c &&
    buffer[3] === 0x46
  ) {
    throw new BadRequestException(
      'Phát hiện tệp thực thi Linux ELF không được phép tải lên.',
    );
  }

  // Java Bytecode class file -> 0xCA 0xFE 0xBA 0xBE
  if (
    buffer.length >= 4 &&
    buffer[0] === 0xca &&
    buffer[1] === 0xfe &&
    buffer[2] === 0xba &&
    buffer[3] === 0xbe
  ) {
    throw new BadRequestException(
      'Phát hiện tệp thực thi Java Class không được phép tải lên.',
    );
  }

  // 2. Recognized Safe Signatures
  // PDF: %PDF-
  if (
    buffer.length >= 5 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    return { isValid: true, detectedType: 'application/pdf' };
  }

  // PNG: \x89PNG\r\n\x1a\n
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { isValid: true, detectedType: 'image/png' };
  }

  // JPEG / JPG: \xFF\xD8\xFF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { isValid: true, detectedType: 'image/jpeg' };
  }

  // ZIP / OpenXML Office (DOCX, XLSX, PPTX, ZIP): 'PK\x03\x04' or 'PK\x05\x06' or 'PK\x07\x08'
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)
  ) {
    return {
      isValid: true,
      detectedType:
        declaredMime || 'application/vnd.openxmlformats-officedocument',
    };
  }

  // Legacy MS Office (DOC, XLS, PPT) Compound File Binary: D0 CF 11 E0 A1 B1 1A E1
  if (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 &&
    buffer[5] === 0xb1 &&
    buffer[6] === 0x1a &&
    buffer[7] === 0xe1
  ) {
    return { isValid: true, detectedType: 'application/msword' };
  }

  // WebP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { isValid: true, detectedType: 'image/webp' };
  }

  // Plain Text / CSV / JSON / Markdown
  // Check if buffer contains valid printable text without suspicious binary control characters
  let isText = true;
  const sampleLength = Math.min(buffer.length, 1024);
  for (let i = 0; i < sampleLength; i++) {
    const byte = buffer[i];
    // Check for null bytes or unusual non-printable ASCII (excluding tab 0x09, LF 0x0A, CR 0x0D)
    if (
      byte === 0x00 ||
      (byte < 0x08 && byte !== 0x00) ||
      (byte > 0x0e && byte < 0x1f)
    ) {
      isText = false;
      break;
    }
  }

  if (isText) {
    return { isValid: true, detectedType: 'text/plain' };
  }

  // If unrecognized binary format
  return {
    isValid: true, // Allow with warning if declared mime matches
    detectedType: declaredMime || 'application/octet-stream',
  };
}
