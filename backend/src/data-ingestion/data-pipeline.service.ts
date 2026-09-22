import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { getExcelCellString } from '../common/utils/excel.util';
import * as ExcelJS from 'exceljs';
import {
  DataIngestionBatch,
  IngestionStatus,
} from './entities/data-ingestion-batch.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { FactDailyMetric } from '../continuous-monitoring/entities/fact-daily-metric.entity';
import { KriAlert } from '../risk-indicators/entities/kri-alert.entity';
import { KriRuleConfig } from '../continuous-monitoring/entities/kri-rule-config.entity';
import { ContinuousMonitoringService } from '../continuous-monitoring/continuous-monitoring.service';

@Injectable()
export class DataPipelineService {
  private readonly logger = new Logger(DataPipelineService.name);

  constructor(
    @InjectRepository(DataIngestionBatch)
    private readonly batchRepo: Repository<DataIngestionBatch>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(FactDailyMetric)
    private readonly factMetricRepo: Repository<FactDailyMetric>,
    @InjectRepository(KriAlert)
    private readonly kriAlertRepo: Repository<KriAlert>,
    @InjectRepository(KriRuleConfig)
    private readonly kriRuleConfigRepo: Repository<KriRuleConfig>,
    private readonly continuousMonitoringService: ContinuousMonitoringService,
  ) {}

  /**
   * Process a single data ingestion batch
   */
  async processBatch(batchId: string): Promise<DataIngestionBatch> {
    const batch = await this.batchRepo.findOne({ where: { id: batchId } });
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }

    if (
      batch.status === IngestionStatus.PROCESSING ||
      batch.status === IngestionStatus.COMPLETED
    ) {
      this.logger.warn(
        `Batch ${batch.batchCode} is already ${batch.status}. Skipping.`,
      );
      return batch;
    }

    batch.status = IngestionStatus.PROCESSING;
    batch.startedAt = new Date();
    batch.errorLog = '';
    await this.batchRepo.save(batch);

    try {
      if (!batch.rawFilePath || !fs.existsSync(batch.rawFilePath)) {
        throw new Error(
          `Raw file path does not exist: ${batch.rawFilePath || 'N/A'}`,
        );
      }

      const fileExt = batch.fileName.split('.').pop()?.toLowerCase();
      let records: any[] = [];

      if (fileExt === 'xlsx' || fileExt === 'xls') {
        records = await this.parseExcel(batch.rawFilePath);
      } else if (fileExt === 'csv') {
        records = await this.parseCsv(batch.rawFilePath);
      } else if (fileExt === 'json') {
        records = await this.parseJson(batch.rawFilePath);
      } else {
        throw new Error(
          `Unsupported file format: .${fileExt}. Allowed formats: .xlsx, .xls, .csv, .json`,
        );
      }

      batch.recordCount = records.length;
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      if (records.length === 0) {
        batch.status = IngestionStatus.COMPLETED;
        batch.completedAt = new Date();
        return await this.batchRepo.save(batch);
      }

      // Check dataset type (Fact Daily Metrics vs General Transactions)
      const firstRow = records[0] || {};
      const isMetricData =
        firstRow.branchcode !== undefined ||
        firstRow.branch_code !== undefined ||
        firstRow.nplratio !== undefined ||
        firstRow.npl_ratio !== undefined ||
        firstRow.carratio !== undefined ||
        firstRow.car_ratio !== undefined;

      if (isMetricData) {
        this.logger.log(
          `Processing batch ${batch.batchCode} as FactDailyMetrics & KRI Dataset...`,
        );
        const result = await this.processFactMetrics(records, batch.periodDate);
        successCount = result.successCount;
        errorCount = result.errorCount;
        errors.push(...result.errors);
      } else {
        this.logger.log(
          `Processing batch ${batch.batchCode} as Transactions Dataset...`,
        );
        const result = await this.processTransactions(records, batch.batchCode);
        successCount = result.successCount;
        errorCount = result.errorCount;
        errors.push(...result.errors);
      }

      batch.successCount = successCount;
      batch.errorCount = errorCount;
      batch.status =
        errorCount > 0 && successCount === 0
          ? IngestionStatus.FAILED
          : IngestionStatus.COMPLETED;
      batch.completedAt = new Date();
      if (errors.length > 0) {
        batch.errorLog = errors.slice(0, 50).join('\n');
      }

      await this.batchRepo.save(batch);

      // Trigger Continuous Monitoring Rules to update alerts immediately
      try {
        this.logger.log(
          `Triggering Continuous Monitoring scan after batch ${batch.batchCode}...`,
        );
        await this.continuousMonitoringService.runScan();
      } catch (scanErr: any) {
        this.logger.error(
          `Continuous Monitoring auto-scan failed: ${scanErr.message}`,
        );
      }

      return batch;
    } catch (err: any) {
      batch.status = IngestionStatus.FAILED;
      batch.errorLog = err.message;
      batch.completedAt = new Date();
      await this.batchRepo.save(batch);
      this.logger.error(
        `Failed to process batch ${batch.batchCode}: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  private async processTransactions(records: any[], batchCode: string) {
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const [index, raw] of records.entries()) {
      try {
        const txCode =
          raw.transactioncode ||
          raw.transaction_code ||
          raw.ma_giao_dich ||
          raw.code ||
          `TX-${batchCode}-${index + 1}`;
        const amount = parseFloat(raw.amount || raw.so_tien || raw.value || 0);
        const accountId =
          raw.accountid ||
          raw.account_id ||
          raw.so_tai_khoan ||
          raw.account ||
          raw.ma_tk ||
          'ACC-UNKNOWN';
        const customerName =
          raw.customername ||
          raw.customer_name ||
          raw.ten_khach_hang ||
          raw.khach_hang ||
          raw.customer ||
          null;
        const vendorName =
          raw.vendorname ||
          raw.vendor_name ||
          raw.nha_cung_cap ||
          raw.vendor ||
          raw.doi_tac ||
          null;
        const description =
          raw.description || raw.noi_dung || raw.dien_giai || raw.ghi_chu || '';
        const txDate =
          raw.transactiondate || raw.transaction_date || raw.ngay_gd || raw.date
            ? new Date(
                raw.transactiondate ||
                  raw.transaction_date ||
                  raw.ngay_gd ||
                  raw.date,
              )
            : new Date();

        let transaction = await this.transactionRepo.findOne({
          where: { transactionCode: String(txCode) },
        });

        if (!transaction) {
          transaction = this.transactionRepo.create({
            transactionCode: String(txCode),
            accountId: String(accountId),
            customerName: customerName ? String(customerName) : undefined,
            vendorName: vendorName ? String(vendorName) : undefined,
            amount: isNaN(amount) ? 0 : amount,
            transactionDate: isNaN(txDate.getTime()) ? new Date() : txDate,
            description: description ? String(description) : undefined,
          });
        } else {
          transaction.accountId = String(accountId);
          if (customerName) transaction.customerName = String(customerName);
          if (vendorName) transaction.vendorName = String(vendorName);
          transaction.amount = isNaN(amount) ? transaction.amount : amount;
          if (!isNaN(txDate.getTime())) transaction.transactionDate = txDate;
          if (description) transaction.description = String(description);
        }

        await this.transactionRepo.save(transaction);
        successCount++;
      } catch (err: any) {
        errorCount++;
        if (errors.length < 50) {
          errors.push(`Row ${index + 1}: ${err.message}`);
        }
      }
    }

    return { successCount, errorCount, errors };
  }

  private async processFactMetrics(
    records: any[],
    fallbackPeriodDate?: string,
  ) {
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Load KRI rules to evaluate thresholds in real time
    const kriRules = await this.kriRuleConfigRepo.find({
      where: { isActive: true },
    });

    for (const [index, raw] of records.entries()) {
      try {
        const branchCode =
          raw.branchcode ||
          raw.branch_code ||
          raw.ma_don_vi ||
          raw.ma_chi_nhanh ||
          'HO';
        const metricDateStr =
          raw.metricdate ||
          raw.metric_date ||
          raw.date ||
          raw.ngay ||
          fallbackPeriodDate ||
          new Date().toISOString().split('T')[0];
        const metricDate = new Date(metricDateStr);

        let fact = await this.factMetricRepo.findOne({
          where: { branchCode: String(branchCode), metricDate },
        });

        if (!fact) {
          fact = this.factMetricRepo.create({
            branchCode: String(branchCode),
            metricDate,
          });
        }

        // Map standard metrics
        if (raw.carratio || raw.car_ratio)
          fact.carRatio = parseFloat(raw.carratio || raw.car_ratio);
        if (raw.nplratio || raw.npl_ratio)
          fact.nplRatio = parseFloat(raw.nplratio || raw.npl_ratio);
        if (raw.group2ratio || raw.group2_ratio)
          fact.group2Ratio = parseFloat(raw.group2ratio || raw.group2_ratio);
        if (raw.llrratio || raw.llr_ratio)
          fact.llrRatio = parseFloat(raw.llrratio || raw.llr_ratio);
        if (raw.cirratio || raw.cir_ratio)
          fact.cirRatio = parseFloat(raw.cirratio || raw.cir_ratio);
        if (raw.nimratio || raw.nim_ratio)
          fact.nimRatio = parseFloat(raw.nimratio || raw.nim_ratio);
        if (raw.roaratio || raw.roa_ratio)
          fact.roaRatio = parseFloat(raw.roaratio || raw.roa_ratio);
        if (raw.roeratio || raw.roe_ratio)
          fact.roeRatio = parseFloat(raw.roeratio || raw.roe_ratio);
        if (raw.ldrratio || raw.ldr_ratio)
          fact.ldrRatio = parseFloat(raw.ldrratio || raw.ldr_ratio);
        if (raw.liquidity30daysratio || raw.liquidity_30days_ratio)
          fact.liquidity30DaysRatio = parseFloat(
            raw.liquidity30daysratio || raw.liquidity_30days_ratio,
          );
        if (raw.liquidityreserveratio || raw.liquidity_reserve_ratio)
          fact.liquidityReserveRatio = parseFloat(
            raw.liquidityreserveratio || raw.liquidity_reserve_ratio,
          );

        await this.factMetricRepo.save(fact);

        // Evaluate KRI Thresholds and generate alerts
        for (const rule of kriRules) {
          let actualVal: number | null = null;
          if (
            rule.ruleCode === 'KRI_NPL' ||
            rule.metricName.toLowerCase().includes('npl')
          ) {
            actualVal = fact.nplRatio;
          } else if (
            rule.ruleCode === 'KRI_CAR' ||
            rule.metricName.toLowerCase().includes('car')
          ) {
            actualVal = fact.carRatio;
          } else if (
            rule.ruleCode === 'KRI_GROUP2' ||
            rule.metricName.toLowerCase().includes('nhóm 2')
          ) {
            actualVal = fact.group2Ratio;
          }

          if (actualVal !== null && !isNaN(actualVal)) {
            let isRed = false;
            let isYellow = false;

            if (rule.operator === '>' || rule.operator === '>=') {
              if (rule.redThreshold && actualVal >= rule.redThreshold)
                isRed = true;
              else if (
                rule.yellowThreshold &&
                actualVal >= rule.yellowThreshold
              )
                isYellow = true;
            } else if (rule.operator === '<' || rule.operator === '<=') {
              if (rule.redThreshold && actualVal <= rule.redThreshold)
                isRed = true;
              else if (
                rule.yellowThreshold &&
                actualVal <= rule.yellowThreshold
              )
                isYellow = true;
            }

            if (isRed || isYellow) {
              const alertLevel = isRed ? 'Red' : 'Yellow';
              const kriAlert = this.kriAlertRepo.create({
                kriCode: rule.ruleCode,
                kriName: rule.metricName,
                departmentName: `Chi nhánh / Đơn vị ${branchCode}`,
                departmentCode: String(branchCode),
                currentValue: `${actualVal}%`,
                thresholdValue: String(
                  isRed
                    ? rule.redThresholdDisplay || rule.redThreshold
                    : rule.yellowThresholdDisplay || rule.yellowThreshold,
                ),
                unit: '%',
                category: rule.category,
                metrics: rule.metricName,
                dataSource: 'DATA_INGESTION_PIPELINE',
                status: alertLevel === 'Red' ? 'RED' : 'YELLOW',
                commentary: `Chỉ số ${rule.metricName} vượt ngưỡng cảnh báo ${alertLevel} (${actualVal}% so với ngưỡng ${isRed ? rule.redThreshold : rule.yellowThreshold}%).`,
              });
              await this.kriAlertRepo.save(kriAlert);
            }
          }
        }

        successCount++;
      } catch (err: any) {
        errorCount++;
        if (errors.length < 50) {
          errors.push(`Row ${index + 1}: ${err.message}`);
        }
      }
    }

    return { successCount, errorCount, errors };
  }

  private async parseExcel(filePath: string): Promise<any[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) return [];

    const headers: string[] = [];
    const rows: any[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell, colNumber) => {
          const header = getExcelCellString(cell.value);
          headers[colNumber] = this.normalizeHeader(header);
        });
      } else {
        const rowData: Record<string, any> = {};
        let hasData = false;
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {
            let val = cell.value;
            if (val && typeof val === 'object' && 'result' in val) {
              val = (val as any).result;
            }
            rowData[header] = val;
            hasData = true;
          }
        });
        if (hasData) {
          rows.push(rowData);
        }
      }
    });

    return rows;
  }

  private async parseCsv(filePath: string): Promise<any[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const rawHeaders = lines[0]
      .split(',')
      .map((h) => h.trim().replace(/^"|"$/g, ''));
    const headers = rawHeaders.map((h) => this.normalizeHeader(h));
    const records: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, any> = {};
      let hasData = false;
      headers.forEach((header, index) => {
        if (header && values[index] !== undefined) {
          row[header] = values[index];
          hasData = true;
        }
      });
      if (hasData) {
        records.push(row);
      }
    }

    return records;
  }

  private async parseJson(filePath: string): Promise<any[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.records || data.data || data.items)) {
      return data.records || data.data || data.items;
    }
    return [data];
  }

  private normalizeHeader(header: string): string {
    return header
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }
}
