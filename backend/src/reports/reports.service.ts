import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ReportDefinition } from './entities/report-definition.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(ReportDefinition)
    private readonly reportRepo: Repository<ReportDefinition>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(): Promise<ReportDefinition[]> {
    return this.reportRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findAllowedForUser(
    roleName: string,
    permissions: string,
  ): Promise<ReportDefinition[]> {
    const all = await this.findAll();
    if (roleName === 'Admin') return all; // Admin sees all

    // Check if permissions string contains view_report_{id}
    const userPerms = Array.isArray(permissions)
      ? permissions
      : (permissions || '').split(',');
    return all.filter((r) => userPerms.includes(`view_report_${r.id}`));
  }

  async create(
    createDto: Partial<ReportDefinition>,
  ): Promise<ReportDefinition> {
    const r = this.reportRepo.create(createDto);
    return this.reportRepo.save(r);
  }

  async update(
    id: number,
    updateDto: Partial<ReportDefinition>,
  ): Promise<ReportDefinition> {
    await this.reportRepo.update(id, updateDto);
    return this.reportRepo.findOne({
      where: { id },
    }) as Promise<ReportDefinition>;
  }

  async remove(id: number): Promise<void> {
    await this.reportRepo.delete(id);
  }

  // Cốt lõi: Xử lý SQL động cho báo cáo
  async executeReport(id: number): Promise<any[]> {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) throw new BadRequestException('Report not found');

    let tableName = '';
    if (report.entityType === 'AuditFinding') tableName = 'audit_findings';
    else if (report.entityType === 'AuditEngagement')
      tableName = 'audit_engagements';
    else if (report.entityType === 'AuditUniverse')
      tableName = 'audit_universe';
    else if (report.entityType === 'Recommendation')
      tableName = 'recommendations';
    else throw new BadRequestException('Unsupported entityType');

    const qb = this.dataSource.createQueryBuilder().from(tableName, 't');

    // Xử lý Group By (Static hoặc JSONB Custom Fields)
    let groupBySelect = report.groupBy;
    if (report.groupBy && report.groupBy.startsWith('cf_')) {
      const actualCfName = report.groupBy.replace('cf_', '');
      groupBySelect = `t."customFields"->>'${actualCfName}'`;
      qb.select(`${groupBySelect}`, 'label');
      qb.groupBy(`${groupBySelect}`);
    } else if (report.groupBy) {
      qb.select(`t."${report.groupBy}"`, 'label');
      qb.groupBy(`t."${report.groupBy}"`);
    }

    // Xử lý Aggregate Func
    const aggFunc = report.aggregateFunc || 'COUNT';
    let aggField = report.aggregateField ? `t."${report.aggregateField}"` : '1';

    // Nếu tính SUM/AVG trên một custom field
    if (report.aggregateField && report.aggregateField.startsWith('cf_')) {
      const actualCfName = report.aggregateField.replace('cf_', '');
      aggField = `CAST(t."customFields"->>'${actualCfName}' AS NUMERIC)`;
    }

    if (aggFunc === 'COUNT') {
      qb.addSelect('COUNT(*)', 'value');
    } else if (aggFunc === 'SUM') {
      qb.addSelect(`SUM(${aggField})`, 'value');
    } else if (aggFunc === 'AVG') {
      qb.addSelect(`AVG(${aggField})`, 'value');
    }

    // (Tương lai) Xử lý filters ở đây nếu cần

    // Không nhóm => Trả về Data Table raw
    if (!report.groupBy && report.chartType === 'table') {
      qb.select('t.*');
      qb.limit(100); // Mặc định limit 100 dòng cho table
    }

    const rawData = await qb.getRawMany();
    return rawData;
  }
}
