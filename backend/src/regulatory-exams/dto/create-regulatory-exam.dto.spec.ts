import { ValidationPipe, BadRequestException } from '@nestjs/common';
import {
  CreateRegulatoryExamDto,
  UpdateRegulatoryExamDto,
  REGULATORY_AUTHORITIES,
} from './create-regulatory-exam.dto';

/**
 * UAT TC-BKS-02a — `POST /api/regulatory-exams` trả HTTP 500 khi thiếu
 * `title`/`authority`.
 *
 * NGUYÊN NHÂN GỐC: controller dùng `@Body() data: any` nên ValidationPipe toàn
 * cục không có metadata để kiểm; payload thiếu trường bắt buộc đâm thẳng vào
 * ràng buộc NOT NULL của PostgreSQL → 500. Spec này khoá lại hợp đồng: payload
 * sai phải bị chặn ở tầng validation với HTTP 400 kèm tên trường lỗi.
 *
 * Pipe dưới đây cấu hình ĐÚNG như `main.ts` (whitelist + forbidNonWhitelisted +
 * transform) để test phản ánh hành vi thật trên production.
 */
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

const bodyMetadata = {
  type: 'body' as const,
  metatype: CreateRegulatoryExamDto,
  data: undefined,
};

const validPayload = {
  title: 'Thanh tra toàn diện NHNN năm 2026',
  authority: 'NHNN',
  startDate: '2026-01-15',
  endDate: '2026-03-31',
};

describe('CreateRegulatoryExamDto (TC-BKS-02a)', () => {
  it('payload hợp lệ đi qua và được transform thành DTO', async () => {
    const result = await pipe.transform(validPayload, bodyMetadata);
    expect(result).toBeInstanceOf(CreateRegulatoryExamDto);
    expect(result).toMatchObject(validPayload);
  });

  it('thiếu title → 400 (KHÔNG phải 500)', async () => {
    const { title, ...rest } = validPayload;
    await expect(pipe.transform(rest, bodyMetadata)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('thiếu authority → 400 (KHÔNG phải 500)', async () => {
    const { authority, ...rest } = validPayload;
    await expect(pipe.transform(rest, bodyMetadata)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('title/authority là chuỗi rỗng → 400', async () => {
    await expect(
      pipe.transform({ ...validPayload, title: '', authority: '' }, bodyMetadata),
    ).rejects.toThrow(BadRequestException);
  });

  it('title/authority chỉ gồm khoảng trắng → 400 (đã trim trước khi validate)', async () => {
    await expect(
      pipe.transform(
        { ...validPayload, title: '   ', authority: '  ' },
        bodyMetadata,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('title/authority bị trim khoảng trắng thừa khi hợp lệ', async () => {
    const result: any = await pipe.transform(
      { ...validPayload, title: '  Đợt thanh tra 2026  ', authority: ' NHNN ' },
      bodyMetadata,
    );
    expect(result.title).toBe('Đợt thanh tra 2026');
    expect(result.authority).toBe('NHNN');
  });

  it('authority ngoài danh mục → 400 (không còn nhận chuỗi tuỳ ý)', async () => {
    await expect(
      pipe.transform({ ...validPayload, authority: 'Cơ quan lạ' }, bodyMetadata),
    ).rejects.toThrow(BadRequestException);
  });

  it('mọi mã trong danh mục đều được chấp nhận', async () => {
    for (const authority of REGULATORY_AUTHORITIES) {
      const result = await pipe.transform(
        { ...validPayload, authority },
        bodyMetadata,
      );
      expect(result).toMatchObject({ authority });
    }
  });

  it('startDate/endDate sai định dạng → 400', async () => {
    await expect(
      pipe.transform({ ...validPayload, startDate: '15/01/2026' }, bodyMetadata),
    ).rejects.toThrow(BadRequestException);
  });

  it('trường lạ bị từ chối (forbidNonWhitelisted)', async () => {
    await expect(
      pipe.transform(
        { ...validPayload, isAdmin: true, injected: 'x' },
        bodyMetadata,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('startDate/endDate là tuỳ chọn — payload tối thiểu vẫn hợp lệ', async () => {
    const result = await pipe.transform(
      { title: 'Đợt tối thiểu', authority: 'KTNN' },
      bodyMetadata,
    );
    expect(result).toMatchObject({ title: 'Đợt tối thiểu', authority: 'KTNN' });
  });
});

describe('UpdateRegulatoryExamDto (PATCH bán phần)', () => {
  const updateMetadata = {
    type: 'body' as const,
    metatype: UpdateRegulatoryExamDto,
    data: undefined,
  };

  it('payload rỗng hợp lệ (không đổi gì)', async () => {
    await expect(pipe.transform({}, updateMetadata)).resolves.toBeDefined();
  });

  it('status ngoài enum → 400', async () => {
    await expect(
      pipe.transform({ status: 'Đang mở' }, updateMetadata),
    ).rejects.toThrow(BadRequestException);
  });

  it('status hợp lệ được chấp nhận', async () => {
    await expect(
      pipe.transform({ status: 'Closed' }, updateMetadata),
    ).resolves.toMatchObject({ status: 'Closed' });
  });
});
