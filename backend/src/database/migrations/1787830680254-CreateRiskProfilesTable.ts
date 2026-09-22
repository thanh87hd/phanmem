import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateRiskProfilesTable1787830680254 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'risk_profiles',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'profileCode',
            type: 'varchar',
          },
          {
            name: 'domainName',
            type: 'varchar',
          },
          {
            name: 'riskCategory',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'riskL1',
            type: 'varchar',
          },
          {
            name: 'riskL2',
            type: 'text',
          },
          {
            name: 'impactCriteria',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'likelihoodCriteria',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'controlMeasures',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'controlDesignQuality',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'inherentImpact',
            type: 'varchar',
            default: "'Trung bình'",
          },
          {
            name: 'inherentLikelihood',
            type: 'varchar',
            default: "'Trung bình'",
          },
          {
            name: 'inherentRiskLevel',
            type: 'varchar',
            default: "'Trung bình'",
          },
          {
            name: 'controlOperatingEffectiveness',
            type: 'varchar',
            default: "'Trung bình'",
          },
          {
            name: 'residualRiskLevel',
            type: 'varchar',
            default: "'Trung bình'",
          },
          {
            name: 'targetEntity',
            type: 'varchar',
            default: "'ĐVKD'",
          },
          {
            name: 'mappedDefectCodes',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('risk_profiles', true);
  }
}
