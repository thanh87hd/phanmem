import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { CreateTestOfControlDto } from './create-test-of-control.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

const bodyMetadata = {
  type: 'body' as const,
  metatype: CreateTestOfControlDto,
  data: undefined,
};

describe('CreateTestOfControlDto Validation', () => {
  it('hợp lệ khi có đầy đủ testId và các trường hợp lệ', async () => {
    const payload = {
      testId: 'TOC-2026-001',
      controlDescription: 'Kiểm soát phê duyệt hạn mức tín dụng',
      itemsTested: 25,
      validExceptions: 0,
    };
    const result = await pipe.transform(payload, bodyMetadata);
    expect(result).toBeInstanceOf(CreateTestOfControlDto);
    expect(result.testId).toBe('TOC-2026-001');
    expect(result.itemsTested).toBe(25);
  });

  it('từ chối khi thiếu testId', async () => {
    const payload = {
      controlDescription: 'Thiếu testId',
    };
    await expect(pipe.transform(payload, bodyMetadata)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('chặn thuộc tính lạ ngoài whitelist (chống Mass Assignment)', async () => {
    const payload = {
      testId: 'TOC-2026-002',
      maliciousField: 'exploit_value',
    };
    await expect(pipe.transform(payload, bodyMetadata)).rejects.toThrow(
      BadRequestException,
    );
  });
});
