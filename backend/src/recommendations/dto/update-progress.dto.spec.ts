import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { UpdateProgressDto } from './update-progress.dto';

/**
 * UAT TC-AUD-04 — "bấm Cập nhật tiến độ không ra thông tin".
 *
 * NGUYÊN NHÂN GỐC (đã xác minh trên production):
 * DTO cũ chỉ khai báo 3 trường (`progressPercent`, `response`, `notes`) trong
 * khi `AuditeePortal.handleSubmitProgress` gửi **11 trường**. Global
 * ValidationPipe trong `main.ts` bật `whitelist: true` +
 * `forbidNonWhitelisted: true`, nên 7 trường dư bị từ chối:
 *     HTTP 400 "property remediationFeasibility should not exist"
 * ⇒ mọi lần báo cáo tiến độ từ cổng ĐVĐKT đều thất bại.
 *
 * Spec này dùng ĐÚNG payload thật của frontend làm hợp đồng, để bất kỳ trường
 * nào frontend gửi thêm mà DTO chưa khai báo sẽ làm test đỏ ngay.
 */
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

const bodyMetadata = {
  type: 'body' as const,
  metatype: UpdateProgressDto,
  data: undefined,
};

/** Payload NGUYÊN VĂN mà AuditeePortal.handleSubmitProgress gửi lên. */
const realFrontendPayload = {
  progressPercent: 60,
  response: 'Đã triển khai một phần theo kế hoạch',
  notes: 'Ghi chú của đơn vị',
  remediationFeasibility: true,
  remediationUnfeasibleReason: '',
  auditeeProposal: 'Đề xuất gia hạn thêm 1 tháng',
  monitoringCycle: '10/2026',
  auditeeUnitHead: 'Trần Thị B',
  auditeePoc: 'Nguyễn Văn C',
  evidenceLink: 'https://drive.example.com/bang-chung',
};

describe('UpdateProgressDto (TC-AUD-04)', () => {
  it('payload THẬT của frontend phải được chấp nhận (không còn 400)', async () => {
    const result = await pipe.transform(realFrontendPayload, bodyMetadata);
    expect(result).toBeInstanceOf(UpdateProgressDto);
    expect(result).toMatchObject(realFrontendPayload);
  });

  it('payload thật khi các ô tuỳ chọn để trống vẫn hợp lệ', async () => {
    const sparse = {
      ...realFrontendPayload,
      response: '',
      notes: '',
      remediationUnfeasibleReason: '',
      auditeeProposal: '',
      auditeeUnitHead: '',
      auditeePoc: '',
      evidenceLink: '',
    };
    await expect(pipe.transform(sparse, bodyMetadata)).resolves.toBeDefined();
  });

  it('evidenceLink rỗng được chuẩn hoá thành undefined (không xoá bằng chứng cũ)', async () => {
    const result: any = await pipe.transform(
      { progressPercent: 10, evidenceLink: '' },
      bodyMetadata,
    );
    expect(result.evidenceLink).toBeUndefined();
  });

  it('progressPercent là trường bắt buộc', async () => {
    const { progressPercent, ...rest } = realFrontendPayload;
    await expect(pipe.transform(rest, bodyMetadata)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('progressPercent ngoài [0,100] → 400', async () => {
    await expect(
      pipe.transform({ ...realFrontendPayload, progressPercent: 150 }, bodyMetadata),
    ).rejects.toThrow(BadRequestException);
    await expect(
      pipe.transform({ ...realFrontendPayload, progressPercent: -5 }, bodyMetadata),
    ).rejects.toThrow(BadRequestException);
  });

  it('remediationFeasibility sai kiểu → 400', async () => {
    await expect(
      pipe.transform(
        { ...realFrontendPayload, remediationFeasibility: 'có' },
        bodyMetadata,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('trường lạ vẫn bị từ chối (giữ bảo vệ forbidNonWhitelisted)', async () => {
    await expect(
      pipe.transform(
        { ...realFrontendPayload, status: 'Verified', isAdmin: true },
        bodyMetadata,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
