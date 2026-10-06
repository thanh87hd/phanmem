import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * UAT TC-FIND-01/02 — sửa lỗi HTTP 500 ở `GET /api/audit-findings`.
 *
 * NGUYÊN NHÂN GỐC:
 * `backend/scripts/migrate-team-members-jsonb.sql` đã chuyển cột
 * `audit_engagements."teamMembers"` từ `text` sang `jsonb`, nhưng file này nằm
 * NGOÀI thư mục `src/database/migrations` nên KHÔNG bao giờ được pipeline
 * TypeORM (và do đó không được CI) thực thi. Kết quả: production vẫn giữ cột
 * kiểu `text` trong khi entity khai báo `jsonb` và truy vấn dùng toán tử
 * containment `@>` → PostgreSQL báo
 *     operator does not exist: text @> jsonb
 * → NestJS nuốt thành lỗi 500 cho mọi tài khoản kiểm toán viên.
 *
 * Migration này đưa việc chuyển kiểu vào ĐÚNG pipeline để CI chạy được, đồng
 * thời có guard để chạy lại an toàn (idempotent).
 *
 * LƯU Ý: code đã được sửa để dùng `"teamMembers"::jsonb @> ...` — đúng trên CẢ
 * hai kiểu cột — nên migration này KHÔNG còn là điều kiện sống còn để hết lỗi
 * 500. Nó chuẩn hoá schema và bật được GIN index cho cột jsonb.
 */
export class ConvertTeamMembersToJsonb1787940000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard: chỉ chuyển khi cột còn ở kiểu khác jsonb (idempotent).
    const [{ data_type: dataType } = { data_type: undefined }] =
      await queryRunner.query(
        `SELECT data_type
           FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'audit_engagements'
            AND column_name = 'teamMembers'`,
      );

    if (dataType && dataType !== 'jsonb') {
      // Chuẩn hoá các giá trị KHÔNG phải JSON hợp lệ trước khi cast, nếu không
      // ALTER ... TYPE jsonb USING sẽ thất bại và chặn cả deploy.
      await queryRunner.query(`
        UPDATE "audit_engagements"
           SET "teamMembers" = '[]'
         WHERE "teamMembers" IS NULL
            OR btrim("teamMembers"::text) IN ('', 'null');
      `);

      await queryRunner.query(`
        ALTER TABLE "audit_engagements"
          ALTER COLUMN "teamMembers" TYPE jsonb
          USING "teamMembers"::jsonb;
      `);
    }

    // Đảm bảo không còn NULL (entity khai báo nullable nên chỉ set default).
    await queryRunner.query(`
      ALTER TABLE "audit_engagements"
        ALTER COLUMN "teamMembers" SET DEFAULT '[]'::jsonb;
    `);

    // GIN index phục vụ toán tử containment @>.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_engagements_team_members_gin
        ON "audit_engagements" USING gin ("teamMembers" jsonb_path_ops);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_engagements_team_members_gin;
    `);
    await queryRunner.query(`
      ALTER TABLE "audit_engagements"
        ALTER COLUMN "teamMembers" DROP DEFAULT;
    `);
    await queryRunner.query(`
      ALTER TABLE "audit_engagements"
        ALTER COLUMN "teamMembers" TYPE text
        USING "teamMembers"::text;
    `);
  }
}
