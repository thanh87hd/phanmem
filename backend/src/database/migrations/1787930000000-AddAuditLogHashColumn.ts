import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * UAT TC-SYS-05: bổ sung cột `hash` (SHA-256, hex 64 ký tự) cho bảng `audit_logs`
 * để mỗi bản ghi nhật ký kiểm toán là bằng chứng chống sửa đổi (tamper-evident).
 *
 * Nullable: các bản ghi đã tồn tại trước migration này không có mã băm — KHÔNG backfill
 * (không thể dựng lại đúng dạng chuẩn tắc cho dữ liệu lịch sử); `verifyIntegrity()` trả
 * về `valid: false` kèm lý do cho các dòng đó.
 */
export class AddAuditLogHashColumn1787930000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
        ADD COLUMN IF NOT EXISTS "hash" character varying(64);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
        DROP COLUMN IF EXISTS "hash";
    `);
  }
}
