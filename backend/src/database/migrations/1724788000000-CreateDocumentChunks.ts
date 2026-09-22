import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocumentChunks1724788000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_chunks (
          id SERIAL PRIMARY KEY,
          "regulatoryKnowledgeId" INTEGER NOT NULL REFERENCES regulatory_knowledge_base(id) ON DELETE CASCADE,
          "chunkIndex" INTEGER NOT NULL,
          content TEXT NOT NULL,
          heading VARCHAR(500),
          "pageNumber" INTEGER,
          "charCount" INTEGER DEFAULT 0,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_document_chunks_reg_id ON document_chunks("regulatoryKnowledgeId");
      CREATE INDEX IF NOT EXISTS idx_document_chunks_reg_chunk ON document_chunks("regulatoryKnowledgeId", "chunkIndex");
      CREATE INDEX IF NOT EXISTS idx_document_chunks_heading ON document_chunks(heading);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS document_chunks CASCADE;
    `);
  }
}
