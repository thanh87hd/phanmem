import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConsolidateTasksAndAuditGeneralTasks1787831000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tạo indexes tối ưu cho truy vấn tasks theo nguồn và cuộc kiểm toán
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_source_type ON tasks("sourceType");
      CREATE INDEX IF NOT EXISTS idx_tasks_engagement_id ON tasks("engagementId");
      CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_id ON tasks("assignedToId");
      CREATE INDEX IF NOT EXISTS idx_tasks_team_code ON tasks("teamCode");
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks("status");
    `);

    // 2. Backfill: Chuyển dữ liệu từ audit_tasks sang tasks với sourceType = 'Audit'
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_tasks') THEN
          INSERT INTO tasks (
            "sourceType",
            "engagementId",
            "engagementName",
            "title",
            "description",
            "assignedToName",
            "status",
            "priority",
            "dueDate",
            "estimatedHours",
            "createdAt",
            "updatedAt"
          )
          SELECT
            'Audit',
            at."engagementId",
            COALESCE(at."engagementName", 'Cuộc kiểm toán #' || at."engagementId"),
            at."title",
            at."description",
            at."assignedTo",
            COALESCE(at."status", 'Todo'),
            COALESCE(at."priority", 'Medium'),
            at."dueDate",
            at."estimatedHours",
            at."createdAt",
            at."updatedAt"
          FROM audit_tasks at
          WHERE NOT EXISTS (
            SELECT 1 FROM tasks t
            WHERE t."sourceType" = 'Audit'
              AND t."engagementId" = at."engagementId"
              AND t."title" = at."title"
          );
        END IF;
      END $$;
    `);

    // 3. Backfill: Chuyển dữ liệu từ general_tasks sang tasks với sourceType = 'General'
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'general_tasks') THEN
          INSERT INTO tasks (
            "sourceType",
            "title",
            "description",
            "category",
            "assignedToId",
            "assignedToName",
            "assignedById",
            "assignedByName",
            "teamCode",
            "priority",
            "dueDate",
            "completedDate",
            "status",
            "notes",
            "createdAt",
            "updatedAt"
          )
          SELECT
            'General',
            gt."title",
            gt."description",
            COALESCE(gt."category", 'Other'),
            gt."assignedToId",
            gt."assignedToName",
            gt."assignedById",
            gt."assignedByName",
            gt."teamCode",
            COALESCE(gt."priority", 'Medium'),
            gt."dueDate",
            gt."completedDate",
            COALESCE(gt."status", 'Open'),
            gt."notes",
            gt."createdAt",
            gt."updatedAt"
          FROM general_tasks gt
          WHERE NOT EXISTS (
            SELECT 1 FROM tasks t
            WHERE t."sourceType" = 'General'
              AND t."title" = gt."title"
              AND (t."assignedToId" = gt."assignedToId" OR (t."assignedToId" IS NULL AND gt."assignedToId" IS NULL))
          );
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Nguyên tắc an toàn: Không drop dữ liệu đã backfill.
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_tasks_source_type;
      DROP INDEX IF EXISTS idx_tasks_engagement_id;
      DROP INDEX IF EXISTS idx_tasks_assigned_to_id;
      DROP INDEX IF EXISTS idx_tasks_team_code;
      DROP INDEX IF EXISTS idx_tasks_status;
    `);
  }
}
