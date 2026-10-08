import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { SmtpConfigDto } from './smtp-config.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

const bodyMetadata = {
  type: 'body' as const,
  metatype: SmtpConfigDto,
  data: undefined,
};

describe('SmtpConfigDto Validation', () => {
  it('hợp lệ với host, port và cấu hình đúng chuẩn', async () => {
    const payload = {
      host: 'smtp.office365.com',
      port: 587,
      authType: 'oauth2',
      secure: false,
      fromName: 'KTNB Alert',
    };
    const result = await pipe.transform(payload, bodyMetadata);
    expect(result).toBeInstanceOf(SmtpConfigDto);
    expect(result.host).toBe('smtp.office365.com');
    expect(result.port).toBe(587);
  });

  it('từ chối khi thiếu host hoặc port', async () => {
    const payload = {
      authType: 'basic',
    };
    await expect(pipe.transform(payload, bodyMetadata)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('từ chối authType không nằm trong danh sách cho phép', async () => {
    const payload = {
      host: 'mail.bank.vn',
      port: 25,
      authType: 'invalid_type',
    };
    await expect(pipe.transform(payload, bodyMetadata)).rejects.toThrow(
      BadRequestException,
    );
  });
});
