import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * UAT TC-AUD-04 — cổng Đơn vị được kiểm toán (Auditee Portal) hiển thị sai
 * trạng thái và KHÔNG có nút "Cập nhật tiến độ".
 *
 * NGUYÊN NHÂN GỐC:
 * Bảng `recommendations` trên production còn tồn tại các giá trị `status` bằng
 * TIẾNG VIỆT từ phiên bản cũ:
 *     'Đã hoàn thành' | 'Chưa khắc phục' | 'Đã khắc phục một phần'
 * trong khi toàn bộ ứng dụng dùng enum tiếng Anh
 *     NotStarted | InProgress | Completed | Overdue | Verified
 *
 * Hệ quả dây chuyền:
 *  1. `statusConfig[record.status]` → `undefined` ⇒ Tag trạng thái hiển thị
 *     nguyên văn chuỗi cũ hoặc rỗng.
 *  2. Nút "Cập nhật tiến độ" chỉ render khi `record.status === 'NotStarted'`
 *     (ActionPlanTrackerTab.tsx) ⇒ KHÔNG BAO GIỜ hiện với dữ liệu cũ.
 *  3. Các API đếm theo `status = 'Overdue'` / `'InProgress'` bỏ sót bản ghi.
 *
 * NGUỒN SỰ THẬT khi ánh xạ là `progressPercent` + `closureStatus`, KHÔNG phải
 * nhãn tiếng Việt (nhãn mơ hồ và có thể do người dùng nhập tay).
 *
 * AN TOÀN: chỉ UPDATE những dòng có `status` NGOÀI enum ⇒ chạy lại nhiều lần
 * không đổi kết quả (idempotent) và không đụng tới dữ liệu đã đúng.
 */
export class NormalizeRecommendationStatus1787941000000
  implements MigrationInterface
{
  private readonly validStatuses = [
    'NotStarted',
    'InProgress',
    'Completed',
    'Overdue',
    'Verified',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Bước 1: ánh xạ theo nguồn sự thật (thứ tự CASE quan trọng).
    await queryRunner.query(
      `
      UPDATE "recommendations"
         SET "status" = CASE
               -- CHỦ Ý KHÔNG dùng closureStatus = 'Closed' để suy ra 'Verified':
               -- nhãn tiếng Việt cũ rõ nghĩa hơn cờ đóng. Một kiến nghị
               -- 'Đã hoàn thành' (progressPercent = 100) nhưng closureStatus còn
               -- 'Open' phải là 'Completed' (ĐVĐKT báo xong, chờ KTV xác nhận),
               -- KHÔNG phải 'Verified' (chỉ do KTV xác nhận). Ở tầng ứng dụng,
               -- close() luôn ghi status='Verified' cùng lúc với closureStatus='Closed'
               -- nên không có bản ghi nào cần suy ra từ cờ đó.
               WHEN COALESCE("progressPercent", 0) >= 100   THEN 'Completed'
               WHEN COALESCE("progressPercent", 0) > 0      THEN 'InProgress'
               WHEN "dueDate" IS NOT NULL
                    AND "dueDate" ~ '^\\d{4}-\\d{2}-\\d{2}'
                    AND "dueDate"::date < CURRENT_DATE      THEN 'Overdue'
               ELSE 'NotStarted'
             END
       WHERE "status" IS NULL
          OR "status" <> ALL($1::text[]);
      `,
      [this.validStatuses],
    );

    // Bước 2: chuẩn hoá `closureStatus` nếu còn giá trị lạ (giữ nguyên 'Open'
    // làm mặc định vì entity khai báo default 'Open').
    await queryRunner.query(
      `
      UPDATE "recommendations"
         SET "closureStatus" = 'Open'
       WHERE "closureStatus" IS NULL
          OR "closureStatus" <> ALL($1::text[]);
      `,
      [
        [
          'Open',
          'PendingAuditeeAction',
          'PendingKTNBReview',
          'PendingTeamLeadOpinion',
          'Closed',
        ],
      ],
    );
  }

  public async down(): Promise<void> {
    // KHÔNG thể khôi phục nhãn tiếng Việt cũ một cách chính xác (thông tin đã
    // mất khi chuẩn hoá, và bản thân các nhãn đó là dữ liệu lỗi).
    // Đây là migration dữ liệu một chiều có chủ ý.
  }
}
