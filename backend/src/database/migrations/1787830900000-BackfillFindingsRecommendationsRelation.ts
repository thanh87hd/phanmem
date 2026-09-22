import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillFindingsRecommendationsRelation1787830900000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tạo index tối ưu cho quan hệ 1-Nhiều giữa findings và recommendations
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_recommendations_finding_id ON recommendations("findingId");
      CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations("status");
      CREATE INDEX IF NOT EXISTS idx_recommendations_department_id ON recommendations("departmentId");
      CREATE INDEX IF NOT EXISTS idx_recommendations_assigned_to_id ON recommendations("assignedToId");
    `);

    // 2. Backfill: Chuyển toàn bộ text recommendation trong audit_findings thành bản ghi recommendations chuẩn (ADR-0010)
    await queryRunner.query(`
      INSERT INTO recommendations (
        "findingId",
        "finding",
        "recommendation",
        "departmentId",
        "department",
        "status",
        "progressPercent",
        "createdAt",
        "updatedAt"
      )
      SELECT
        af.id,
        COALESCE(af."findingTitle", 'Phát hiện kiểm toán #' || af.id),
        af.recommendation,
        COALESCE(af."responsibleUnitId", af."managingBranchId"),
        af."managingBranchName",
        'Open',
        0,
        af."createdAt",
        af."updatedAt"
      FROM audit_findings af
      WHERE af.recommendation IS NOT NULL 
        AND LENGTH(TRIM(af.recommendation)) > 0
        AND NOT EXISTS (
          SELECT 1 FROM recommendations r WHERE r."findingId" = af.id
        );
    `);

    // 3. Đồng bộ snapshot findingTitle vào recommendations nếu trường finding bị trống
    await queryRunner.query(`
      UPDATE recommendations r
      SET "finding" = af."findingTitle"
      FROM audit_findings af
      WHERE r."findingId" = af.id
        AND (r."finding" IS NULL OR r."finding" = '');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Theo nguyên tắc an toàn: Không drop dữ liệu đã backfill.
    // Chỉ drop các index phụ nếu cần rollback.
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_recommendations_finding_id;
      DROP INDEX IF EXISTS idx_recommendations_status;
      DROP INDEX IF EXISTS idx_recommendations_department_id;
      DROP INDEX IF EXISTS idx_recommendations_assigned_to_id;
    `);
  }
}
