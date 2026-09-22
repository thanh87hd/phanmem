import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKriBacktestResultsTable1724785000000 implements MigrationInterface {
  name = 'CreateKriBacktestResultsTable1724785000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."kri_backtest_results_strategy_enum" AS ENUM('HISTORICAL_REPLAY', 'WALK_FORWARD', 'MONTE_CARLO');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS "kri_backtest_results" (
        "id" SERIAL NOT NULL,
        "ruleCode" character varying(100) NOT NULL,
        "ruleName" character varying(255) NOT NULL,
        "strategy" "public"."kri_backtest_results_strategy_enum" NOT NULL DEFAULT 'HISTORICAL_REPLAY',
        "startDate" date NOT NULL,
        "endDate" date NOT NULL,
        "testedThresholds" jsonb NOT NULL,
        "totalObservations" integer NOT NULL DEFAULT 0,
        "truePositives" integer NOT NULL DEFAULT 0,
        "falsePositives" integer NOT NULL DEFAULT 0,
        "trueNegatives" integer NOT NULL DEFAULT 0,
        "falseNegatives" integer NOT NULL DEFAULT 0,
        "hitRateRecall" double precision NOT NULL DEFAULT '0',
        "precision" double precision NOT NULL DEFAULT '0',
        "falsePositiveRate" double precision NOT NULL DEFAULT '0',
        "f1Score" double precision NOT NULL DEFAULT '0',
        "aucRoc" double precision NOT NULL DEFAULT '0',
        "optimalThresholdRecommendation" jsonb,
        "timeSeriesDetails" jsonb,
        "executedBy" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_kri_backtest_results" PRIMARY KEY ("id")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "kri_backtest_results"`);
  }
}
