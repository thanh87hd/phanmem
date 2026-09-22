import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExtractionMetadata1724786000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE regulatory_knowledge_base 
        ADD COLUMN IF NOT EXISTS "pageCount" integer;
      ALTER TABLE regulatory_knowledge_base 
        ADD COLUMN IF NOT EXISTS "extractionMethod" varchar;
      ALTER TABLE regulatory_knowledge_base 
        ADD COLUMN IF NOT EXISTS "ocrConfidence" float;
      ALTER TABLE regulatory_knowledge_base 
        ADD COLUMN IF NOT EXISTS "sourceDocumentId" integer;
      ALTER TABLE regulatory_knowledge_base 
        ALTER COLUMN "businessProcess" DROP NOT NULL;
      ALTER TABLE regulatory_knowledge_base 
        ALTER COLUMN "businessProcess" SET DEFAULT 'Chung';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE regulatory_knowledge_base 
        DROP COLUMN IF EXISTS "pageCount",
        DROP COLUMN IF EXISTS "extractionMethod",
        DROP COLUMN IF EXISTS "ocrConfidence",
        DROP COLUMN IF EXISTS "sourceDocumentId";
    `);
  }
}
