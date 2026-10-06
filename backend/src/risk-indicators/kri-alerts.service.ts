import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, DeepPartial } from 'typeorm';
import { KriAlert } from './entities/kri-alert.entity';
import { AuditUniverse } from '../audit-universe/entities/audit-universe.entity';
import * as ExcelJS from 'exceljs';
import { v4 as uuidv4 } from 'uuid';
import { CreateKriAlertDto } from './dto/create-kri-alert.dto';
import { UpdateKriAlertDto } from './dto/update-kri-alert.dto';

export interface KriUploadedFile {
  originalname: string;
  buffer?: Buffer;
  path?: string;
  size?: number;
  mimetype?: string;
}

/**
 * Một dòng so sánh KRI giữa 2 kỳ báo cáo.
 *
 * Trước đây interface này được khai báo CỤC BỘ trong `compareKriPeriods`, khiến
 * TypeScript không thể "đặt tên" cho kiểu trả về của method công khai
 * (TS4053/TS4055) — làm hỏng `npm run build:tsc` và chặn CI. Nay đưa ra phạm vi
 * module và export để controller/DTO khác tham chiếu được.
 */
export interface KriPeriodComparisonItem {
  kriCode: string;
  kriName?: string;
  departmentName?: string;
  period1Value?: string;
  period1Threshold?: string;
  period1Severity?: string;
  period2Value?: string;
  period2Threshold?: string;
  period2Severity?: string;
  severityChanged?: boolean;
  thresholdChanged?: boolean;
  valueChanged?: boolean;
  /** Trường dùng cho nhóm "không đổi" (giữ nguyên giá trị kỳ 1). */
  value?: string;
  threshold?: string;
  severity?: string;
  /** Xu hướng biến động giữa 2 kỳ. */
  trend?: string;
}

@Injectable()
export class KriAlertsService {
  private readonly logger = new Logger(KriAlertsService.name);

  constructor(
    @InjectRepository(KriAlert)
    private readonly kriRepository: Repository<KriAlert>,
    private readonly entityManager: EntityManager,
  ) {}

  /**
   * Helper chuẩn hóa và đồng bộ dữ liệu dual-read/write cho KRI
   */
  private normalizeKriData<T extends Record<string, unknown>>(data: T): T & Record<string, unknown> {
    const raw = data as Record<string, unknown>;
    const observedValue = String(
      raw.observedValue || raw.currentValue || raw.figure || '',
    );
    const currentValue = String(
      raw.currentValue || raw.observedValue || raw.figure || '',
    );
    const figure = String(
      raw.figure || raw.observedValue || raw.currentValue || '',
    );

    const thresholdValue = String(
      raw.thresholdValue || raw.threshold || '0',
    );
    const threshold = String(
      raw.threshold || raw.thresholdValue || '',
    );

    return {
      ...data,
      observedValue,
      currentValue,
      figure,
      thresholdValue,
      threshold,
    };
  }

  async createKriAlert(dto: CreateKriAlertDto): Promise<KriAlert> {
    const normalized = this.normalizeKriData(
      dto as unknown as Record<string, unknown>,
    );
    const alert = this.kriRepository.create(
      normalized as unknown as DeepPartial<KriAlert>,
    );
    return this.kriRepository.save(alert);
  }

  async createKriBulk(dtoList: CreateKriAlertDto[]): Promise<KriAlert[]> {
    const normalizedList = dtoList.map((dto) =>
      this.normalizeKriData(dto as unknown as Record<string, unknown>),
    );
    const alerts = this.kriRepository.create(
      normalizedList as unknown as DeepPartial<KriAlert>[],
    );
    return this.kriRepository.save(alerts);
  }

  async findAllKriAlerts(): Promise<KriAlert[]> {
    return this.kriRepository.find({
      order: { createdAt: 'DESC' },
      relations: ['auditUniverse'],
    });
  }

  async findOne(id: number): Promise<KriAlert> {
    const alert = await this.kriRepository.findOne({
      where: { id },
      relations: ['auditUniverse'],
    });
    if (!alert) throw new NotFoundException(`KRI Alert #${id} not found`);
    return alert;
  }

  async update(id: number, dto: UpdateKriAlertDto): Promise<KriAlert> {
    const alert = await this.findOne(id);
    const normalized = this.normalizeKriData(
      dto as unknown as Record<string, unknown>,
    );
    Object.assign(alert, normalized);
    return this.kriRepository.save(alert);
  }

  async remove(id: number): Promise<void> {
    const alert = await this.findOne(id);
    await this.kriRepository.remove(alert);
  }

  async findActiveKriAlerts(): Promise<KriAlert[]> {
    return this.kriRepository.find({
      where: { status: 'Active' },
      order: { createdAt: 'DESC' },
      relations: ['auditUniverse'],
    });
  }

  // ==================== KRI BULK UPLOAD (shared metadata for all files) ====================

  async uploadKriBulkFiles(
    files: KriUploadedFile[],
    metadata: {
      reportMonth?: number;
      reportYear?: number;
      auditUniverseId?: number;
      departmentCode?: string;
    },
  ) {
    const uploadBatchId = uuidv4();
    const allAlerts: KriAlert[] = [];
    const fileResults: Array<{
      fileName: string;
      fileSize?: number;
      rowsParsed: number;
      alertsCreated: number;
      status: 'success' | 'error';
      errorMessage?: string;
    }> = [];
    const universes = await this.entityManager
      .getRepository(AuditUniverse)
      .find();

    for (const file of files) {
      try {
        const rows = await this.parseKriFile(file);
        const alerts: KriAlert[] = [];

        for (const row of rows) {
          const alertData = this.buildAlertFromRow(
            row,
            {
              ...metadata,
              sourceFileName: file.originalname,
              uploadBatchId,
            },
            universes,
          );
          alerts.push(this.kriRepository.create(alertData));
        }

        const saved = await this.kriRepository.save(alerts);
        allAlerts.push(...saved);
        fileResults.push({
          fileName: file.originalname,
          fileSize: file.size,
          rowsParsed: rows.length,
          alertsCreated: saved.length,
          status: 'success',
        });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        fileResults.push({
          fileName: file.originalname,
          fileSize: file.size,
          rowsParsed: 0,
          alertsCreated: 0,
          status: 'error',
          errorMessage: msg,
        });
      }
    }

    return {
      uploadBatchId,
      totalFiles: files.length,
      totalAlertsCreated: allAlerts.length,
      reportMonth: metadata.reportMonth,
      reportYear: metadata.reportYear,
      files: fileResults,
    };
  }

  // ==================== KRI PER-FILE UPLOAD (each file has own metadata) ====================

  async uploadKriPerFile(files: KriUploadedFile[], filesMetadataRaw: string) {
    let filesMetadata: Array<Record<string, unknown>> = [];
    try {
      filesMetadata = JSON.parse(filesMetadataRaw || '[]');
    } catch {
      filesMetadata = [];
    }

    const uploadBatchId = uuidv4();
    const allAlerts: KriAlert[] = [];
    const fileResults: Array<{
      fileName: string;
      fileSize?: number;
      rowsParsed: number;
      alertsCreated: number;
      reportMonth?: number;
      reportYear?: number;
      auditUniverseId?: number;
      status: 'success' | 'error';
      errorMessage?: string;
    }> = [];
    const universes = await this.entityManager
      .getRepository(AuditUniverse)
      .find();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const meta =
        (filesMetadata.find((m) => m.fileName === file.originalname) as Record<string, string | number>) ||
        (filesMetadata[i] as Record<string, string | number>) ||
        {};

      const metadata = {
        reportMonth: meta.reportMonth
          ? parseInt(String(meta.reportMonth), 10)
          : undefined,
        reportYear: meta.reportYear
          ? parseInt(String(meta.reportYear), 10)
          : undefined,
        auditUniverseId: meta.auditUniverseId
          ? parseInt(String(meta.auditUniverseId), 10)
          : undefined,
        departmentCode: meta.departmentCode ? String(meta.departmentCode) : undefined,
        sourceFileName: file.originalname,
        uploadBatchId,
      };

      try {
        const rows = await this.parseKriFile(file);
        const alerts: KriAlert[] = [];

        for (const row of rows) {
          const alertData = this.buildAlertFromRow(row, metadata, universes);
          alerts.push(this.kriRepository.create(alertData));
        }

        const saved = await this.kriRepository.save(alerts);
        allAlerts.push(...saved);
        fileResults.push({
          fileName: file.originalname,
          fileSize: file.size,
          rowsParsed: rows.length,
          alertsCreated: saved.length,
          reportMonth: metadata.reportMonth,
          reportYear: metadata.reportYear,
          auditUniverseId: metadata.auditUniverseId,
          status: 'success',
        });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        fileResults.push({
          fileName: file.originalname,
          rowsParsed: 0,
          alertsCreated: 0,
          status: 'error',
          errorMessage: msg,
        });
      }
    }

    return {
      uploadBatchId,
      totalFiles: files.length,
      totalAlertsCreated: allAlerts.length,
      files: fileResults,
    };
  }

  // ==================== PARSE FILE & BUILD ALERT ====================

  private cleanKey(str: string): string {
    return String(str || '')
      .toLowerCase()
      .replace(/[\r\n\t]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  public async parseKriFile(
    file: KriUploadedFile,
  ): Promise<Record<string, unknown>[]> {
    if (!file.path) {
      throw new Error('File path is required to read KRI workbook.');
    }
    const parsedRows: Record<string, unknown>[] = [];
    const workbook = new ExcelJS.stream.xlsx.WorkbookReader(file.path, {
      worksheets: 'emit',
      sharedStrings: 'cache',
    });

    let sheetName = '';
    const rawRows: unknown[][] = [];

    for await (const worksheetReader of workbook) {
      for await (const row of worksheetReader) {
        const values = Array.isArray(row.values) ? row.values.slice(1) : [];
        if (values.length > 0) {
          rawRows.push(values);
        }
      }
      if (rawRows.length > 0) {
        sheetName = (worksheetReader as { name?: string }).name || 'Sheet1';
        break;
      }
    }

    if (!sheetName) {
      throw new Error('All sheets in Excel file are empty.');
    }

    // Find header row dynamically
    let headerRowIndex = -1;
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (
        row &&
        row.some((cell) => this.cleanKey(String(cell)).includes('no')) &&
        row.some(
          (cell) =>
            this.cleanKey(String(cell)).includes('metrics') ||
            this.cleanKey(String(cell)).includes('chiso'),
        )
      ) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      headerRowIndex = 0;
    }

    const rawHeaders = rawRows[headerRowIndex].map((h) => String(h));
    let currentCategory = '';

    for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
      const rawRow = rawRows[i];
      if (!rawRow || rawRow.length === 0) continue;

      const rowObj: Record<string, any> = { _rawRow: rawRow };
      rawHeaders.forEach((header, colIdx) => {
        const normalizedKey = this.cleanKey(header);
        rowObj[normalizedKey] =
          rawRow[colIdx] !== undefined ? rawRow[colIdx] : '';
      });

      const idVal = String(rawRow[0] || '').trim();

      let categoryVal = '';
      let metricsVal = '';
      let dataSourceVal = '';
      let figureVal = '';
      let currentRatingVal = '';
      let expectedRatingVal = '';
      let commentaryVal = '';
      let mitigationVal = '';
      let noteVal = '';

      Object.entries(rowObj).forEach(([normKey, val]) => {
        if (normKey.includes('category') || normKey.includes('danhmuc')) {
          categoryVal = String(val).trim();
        }
        if (normKey.includes('metrics') || normKey.includes('chiso')) {
          metricsVal = String(val).trim();
        }
        if (normKey.includes('datasource') || normKey.includes('nguondulieu')) {
          dataSourceVal = String(val).trim();
        }
        if (
          normKey.includes('figure') ||
          normKey.includes('solieu') ||
          normKey.includes('giatrithucte') ||
          normKey.includes('giatri')
        ) {
          figureVal = String(val).trim();
        }
        if (
          normKey.includes('currentrating') ||
          normKey.includes('xephanghientai')
        ) {
          currentRatingVal = String(val).trim();
        }
        if (
          normKey.includes('expectedrating') ||
          normKey.includes('xephangdukien')
        ) {
          expectedRatingVal = String(val).trim();
        }
        if (normKey.includes('commentary') || normKey.includes('nhanxet')) {
          commentaryVal = String(val).trim();
        }
        if (normKey.includes('mitigation') || normKey.includes('giamthieu')) {
          mitigationVal = String(val).trim();
        }
        if (normKey.includes('note') || normKey.includes('ghichu')) {
          noteVal = String(val).trim();
        }
      });

      const idClean = idVal.replace(/\./g, '').trim();
      const isNumericId = /^\d+$/.test(idClean);

      if (isNumericId && categoryVal && !metricsVal) {
        currentCategory = categoryVal;
        continue;
      }

      if (!metricsVal) continue;

      let thresholdValue = '';
      const thresholdParts: string[] = [];
      rawHeaders.forEach((header, colIdx) => {
        const normKey = this.cleanKey(header);
        if (normKey.includes('threshold') || normKey.includes('nguong')) {
          const val = String(rawRow[colIdx] || '').trim();
          if (val) {
            const label = header
              .replace(/Threshold for |Ngưỡng |Department/gi, '')
              .trim();
            if (
              label &&
              label.length > 1 &&
              !this.cleanKey(label).includes('threshold') &&
              !this.cleanKey(label).includes('nguong')
            ) {
              thresholdParts.push(`${label}: ${val}`);
            } else {
              thresholdParts.push(val);
            }
          }
        }
      });
      thresholdValue = thresholdParts.join(' | ');

      rowObj['_parsedCategory'] = categoryVal || currentCategory;
      rowObj['_parsedMetrics'] = metricsVal;
      rowObj['_parsedDataSource'] = dataSourceVal;
      rowObj['_parsedThreshold'] = thresholdValue;
      rowObj['_parsedFigure'] = figureVal;
      rowObj['_parsedCurrentRating'] = currentRatingVal;
      rowObj['_parsedExpectedRating'] = expectedRatingVal;
      rowObj['_parsedCommentary'] = commentaryVal;
      rowObj['_parsedMitigation'] = mitigationVal;
      rowObj['_parsedNote'] = noteVal;
      rowObj['id'] = idVal;

      parsedRows.push(rowObj);
    }

    return parsedRows;
  }

  /**
   * Ép một giá trị `unknown` (đọc từ ô Excel) về chuỗi an toàn.
   *
   * `parseKriFile` trả về `Record<string, unknown>[]` nên mọi giá trị trong
   * `row` đều là `unknown`; dùng `||` trực tiếp sẽ cho ra `unknown`/`{}` và
   * không gán được vào các trường `string` của `KriAlert`. Hàm này chuẩn hoá
   * đúng NGỮ NGHĨA cũ (`''` và `0` coi như rỗng) mà vẫn giữ type an toàn.
   */
  private asString(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return '';
  }

  /** Ép giá trị `unknown` về số; trả `undefined` nếu không phải số hợp lệ. */
  private asNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
    return undefined;
  }

  private buildAlertFromRow(
    row: Record<string, unknown>,
    metadata: Record<string, unknown>,
    universes: AuditUniverse[],
  ): DeepPartial<KriAlert> {
    const category = String(row._parsedCategory || '').trim();
    const metrics = String(row._parsedMetrics || '').trim();
    const dataSource = String(row._parsedDataSource || '').trim();
    const threshold = String(row._parsedThreshold || '').trim();
    const figure = String(row._parsedFigure || '').trim();
    const currentRating = String(row._parsedCurrentRating || '').trim();
    const expectedRating = String(row._parsedExpectedRating || '').trim();
    const commentary = String(row._parsedCommentary || '').trim();
    const mitigation = String(row._parsedMitigation || '').trim();
    const note = String(row._parsedNote || '').trim();

    const departmentName =
      this.asString(row.departmentName) ||
      this.asString(row['Đơn vị']) ||
      this.asString(row['Don vi']) ||
      this.asString(row['Bộ phận']) ||
      this.asString(row['Bo phan']) ||
      this.asString(metadata.departmentCode);
    const unit =
      this.asString(row.unit) ||
      this.asString(row['Đơn vị tính']) ||
      this.asString(row['Don vi tinh']) ||
      this.asString(row['Unit']);

    const existingSeverity =
      currentRating ||
      this.asString(row.severity) ||
      this.asString(row['Mức độ']) ||
      this.asString(row['Muc do']);
    let severity = 'Medium';
    const cleanSev = existingSeverity.toLowerCase();
    if (
      cleanSev.includes('red') ||
      cleanSev.includes('critical') ||
      cleanSev.includes('đỏ')
    ) {
      severity = 'Critical';
    } else if (
      cleanSev.includes('amber') ||
      cleanSev.includes('high') ||
      cleanSev.includes('cam') ||
      cleanSev.includes('cao')
    ) {
      severity = 'High';
    } else if (
      cleanSev.includes('yellow') ||
      cleanSev.includes('gold') ||
      cleanSev.includes('vàng') ||
      cleanSev.includes('trung bình')
    ) {
      severity = 'Medium';
    } else if (
      cleanSev.includes('green') ||
      cleanSev.includes('low') ||
      cleanSev.includes('xanh') ||
      cleanSev.includes('thấp')
    ) {
      severity = 'Low';
    } else {
      severity = this.autoDetectSeverity(
        this.asString(row.kriCode) || 'KRI_IMPORT',
        figure,
        threshold,
      );
    }

    const kriCode =
      this.asString(row.kriCode) ||
      this.asString(row['Mã KRI']) ||
      this.asString(row['Ma KRI']) ||
      this.asString(row['KRI Code']) ||
      `KRI_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Auto-match auditUniverseId & departmentId
    let auditUniverseId = this.asNumber(metadata.auditUniverseId);
    let departmentId: number | undefined = undefined;
    if (departmentName) {
      const matched = universes.find(
        (u) =>
          u.name === departmentName ||
          u.department === departmentName ||
          u.departmentCode === metadata.departmentCode,
      );
      if (matched) {
        if (!auditUniverseId) auditUniverseId = matched.id;
      }
    }

    const observedValue = figure;
    const thresholdValue = threshold;

    return {
      kriCode,
      kriName: metrics,
      category,
      metrics,
      dataSource,
      threshold,
      figure,
      currentRating,
      expectedRating,
      commentary,
      mitigation,
      departmentId,
      departmentName:
        departmentName ||
        this.asString(metadata.departmentCode) ||
        'Không xác định',
      departmentCode:
        this.asString(metadata.departmentCode) ||
        this.asString(row.departmentCode) ||
        this.asString(row['Mã đơn vị']) ||
        undefined,

      observedValue,
      currentValue: figure,
      thresholdValue,
      unit: unit || undefined,
      note: note || undefined,
      severity,
      status: this.asString(row.status) || 'Active',
      reportMonth: this.asNumber(metadata.reportMonth),
      reportYear: this.asNumber(metadata.reportYear),
      auditUniverseId: auditUniverseId || undefined,
      sourceFileName: this.asString(metadata.sourceFileName) || undefined,
      uploadBatchId: this.asString(metadata.uploadBatchId) || undefined,
    };
  }

  private autoDetectSeverity(
    kriCode: string,
    currentValue: string,
    thresholdValue: string,
  ): string {
    const curNum = parseFloat(String(currentValue).replace(/[^0-9.]/g, ''));
    const threshNum = parseFloat(
      String(thresholdValue).replace(/[^0-9.]/g, ''),
    );
    if (isNaN(curNum) || isNaN(threshNum)) return 'Medium';

    const upperBoundKri =
      /NPL|DOWNTIME|ALERT|ERROR|FAIL|LIMIT|DELAY|TURNOVER/i.test(kriCode);
    if (upperBoundKri) {
      if (curNum <= threshNum) return 'Low';
      const ratio = (curNum - threshNum) / threshNum;
      return ratio > 0.4 ? 'Critical' : 'High';
    } else {
      if (curNum >= threshNum) return 'Low';
      const ratio = (threshNum - curNum) / threshNum;
      return ratio > 0.15 ? 'Critical' : 'High';
    }
  }

  // ==================== KRI PERIOD REPORT ====================

  async getKriPeriodReport(filters: {
    year?: number;
    fromMonth?: number;
    toMonth?: number;
    auditUniverseId?: number;
    departmentCode?: string;
  }) {
    const qb = this.kriRepository.createQueryBuilder('kri');

    if (filters.year) {
      qb.andWhere('kri.reportYear = :year', { year: filters.year });
    }
    if (filters.fromMonth) {
      qb.andWhere('kri.reportMonth >= :fromMonth', {
        fromMonth: filters.fromMonth,
      });
    }
    if (filters.toMonth) {
      qb.andWhere('kri.reportMonth <= :toMonth', { toMonth: filters.toMonth });
    }
    if (filters.auditUniverseId) {
      qb.andWhere('kri.auditUniverseId = :auditUniverseId', {
        auditUniverseId: filters.auditUniverseId,
      });
    }
    if (filters.departmentCode) {
      qb.andWhere('kri.departmentCode = :departmentCode', {
        departmentCode: filters.departmentCode,
      });
    }

    qb.orderBy('kri.reportYear', 'ASC')
      .addOrderBy('kri.reportMonth', 'ASC')
      .addOrderBy('kri.kriCode', 'ASC');

    const allAlerts = await qb.getMany();

    const monthSet = new Set<string>();
    for (const a of allAlerts) {
      if (a.reportYear && a.reportMonth) {
        monthSet.add(
          `${a.reportYear}-${String(a.reportMonth).padStart(2, '0')}`,
        );
      }
    }
    const months = Array.from(monthSet).sort();

    const byKriCode: Record<string, any> = {};
    for (const alert of allAlerts) {
      const code = alert.kriCode;
      if (!byKriCode[code]) {
        byKriCode[code] = {
          kriCode: code,
          kriName: alert.kriName,
          category: alert.category,
          metrics: alert.metrics,
          dataSource: alert.dataSource,
          threshold: alert.threshold || alert.thresholdValue,
          figure: alert.figure || alert.observedValue || alert.currentValue,
          currentRating: alert.currentRating,
          expectedRating: alert.expectedRating,
          commentary: alert.commentary,
          mitigation: alert.mitigation,
          departmentId: alert.departmentId,
          departmentName: alert.departmentName,
          departmentCode: alert.departmentCode,
          unit: alert.unit,
          totalAlerts: 0,
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          months: {},
        };
      }
      const period = `${alert.reportYear}-${String(alert.reportMonth).padStart(2, '0')}`;
      byKriCode[code].months[period] = {
        observedValue: alert.observedValue || alert.currentValue || alert.figure,
        currentValue: alert.currentValue || alert.observedValue || alert.figure,
        thresholdValue: alert.thresholdValue || alert.threshold,
        severity: alert.severity,
        note: alert.note,
        category: alert.category,
        metrics: alert.metrics,
        dataSource: alert.dataSource,
        threshold: alert.threshold || alert.thresholdValue,
        figure: alert.figure || alert.observedValue || alert.currentValue,
        currentRating: alert.currentRating,
        expectedRating: alert.expectedRating,
        commentary: alert.commentary,
        mitigation: alert.mitigation,
      };
      byKriCode[code].totalAlerts++;
      if (alert.severity === 'Critical') byKriCode[code].criticalCount++;
      else if (alert.severity === 'High') byKriCode[code].highCount++;
      else if (alert.severity === 'Medium') byKriCode[code].mediumCount++;
      else byKriCode[code].lowCount++;
    }

    const byDepartment: Record<string, any> = {};
    for (const alert of allAlerts) {
      const dept = alert.departmentName || 'Không xác định';
      if (!byDepartment[dept]) {
        byDepartment[dept] = {
          departmentId: alert.departmentId,
          departmentName: dept,
          departmentCode: alert.departmentCode,
          auditUniverseId: alert.auditUniverseId,
          totalAlerts: 0,
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
        };
      }
      byDepartment[dept].totalAlerts++;
      if (alert.severity === 'Critical') byDepartment[dept].criticalCount++;
      else if (alert.severity === 'High') byDepartment[dept].highCount++;
      else if (alert.severity === 'Medium') byDepartment[dept].mediumCount++;
      else byDepartment[dept].lowCount++;
    }

    const byMonth: Record<string, any> = {};
    for (const alert of allAlerts) {
      const key = `${alert.reportYear || '?'}-${String(alert.reportMonth || '?').padStart(2, '0')}`;
      if (!byMonth[key]) {
        byMonth[key] = {
          period: key,
          reportYear: alert.reportYear,
          reportMonth: alert.reportMonth,
          totalAlerts: 0,
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
        };
      }
      byMonth[key].totalAlerts++;
      if (alert.severity === 'Critical') byMonth[key].criticalCount++;
      else if (alert.severity === 'High') byMonth[key].highCount++;
      else if (alert.severity === 'Medium') byMonth[key].mediumCount++;
      else byMonth[key].lowCount++;
    }

    return {
      filters,
      months,
      totalAlerts: allAlerts.length,
      criticalCount: allAlerts.filter((a) => a.severity === 'Critical').length,
      highCount: allAlerts.filter((a) => a.severity === 'High').length,
      mediumCount: allAlerts.filter((a) => a.severity === 'Medium').length,
      lowCount: allAlerts.filter((a) => a.severity === 'Low').length,
      byKriCode: Object.values(byKriCode),
      byDepartment: Object.values(byDepartment),
      byMonth: Object.values(byMonth).sort((a, b) => {
        if (a.reportYear !== b.reportYear) return a.reportYear - b.reportYear;
        return a.reportMonth - b.reportMonth;
      }),
    };
  }

  // ==================== KRI PERIOD COMPARISON ====================

  async compareKriPeriods(
    period1: { year: number; month: number },
    period2: { year: number; month: number },
    filters: {
      auditUniverseId?: number;
      departmentCode?: string;
    } = {},
  ) {
    const buildQb = (year: number, month: number) => {
      const qb = this.kriRepository
        .createQueryBuilder('kri')
        .where('kri.reportYear = :year', { year })
        .andWhere('kri.reportMonth = :month', { month });
      if (filters.auditUniverseId)
        qb.andWhere('kri.auditUniverseId = :auditUniverseId', {
          auditUniverseId: filters.auditUniverseId,
        });
      if (filters.departmentCode)
        qb.andWhere('kri.departmentCode = :departmentCode', {
          departmentCode: filters.departmentCode,
        });
      return qb.getMany();
    };

    const [alerts1, alerts2] = await Promise.all([
      buildQb(period1.year, period1.month),
      buildQb(period2.year, period2.month),
    ]);

    const map1: Record<string, KriAlert> = {};
    const map2: Record<string, KriAlert> = {};
    for (const a of alerts1) map1[a.kriCode] = a;
    for (const a of alerts2) map2[a.kriCode] = a;

    const allCodes = new Set([...Object.keys(map1), ...Object.keys(map2)]);

    const added: KriPeriodComparisonItem[] = [];
    const removed: KriPeriodComparisonItem[] = [];
    const changed: KriPeriodComparisonItem[] = [];
    const unchanged: KriPeriodComparisonItem[] = [];

    for (const code of allCodes) {
      const a1 = map1[code];
      const a2 = map2[code];

      if (!a1 && a2) {
        added.push({
          kriCode: code,
          kriName: a2.kriName,
          departmentName: a2.departmentName,
          period2Value: a2.observedValue || a2.currentValue,
          period2Threshold: a2.thresholdValue,
          period2Severity: a2.severity,
        });
      } else if (a1 && !a2) {
        removed.push({
          kriCode: code,
          kriName: a1.kriName,
          departmentName: a1.departmentName,
          period1Value: a1.observedValue || a1.currentValue,
          period1Threshold: a1.thresholdValue,
          period1Severity: a1.severity,
        });
      } else if (a1 && a2) {
        const val1 = a1.observedValue || a1.currentValue;
        const val2 = a2.observedValue || a2.currentValue;
        const valueChanged = val1 !== val2;
        const severityChanged = a1.severity !== a2.severity;
        const thresholdChanged = a1.thresholdValue !== a2.thresholdValue;

        if (valueChanged || severityChanged || thresholdChanged) {
          changed.push({
            kriCode: code,
            kriName: a2.kriName,
            departmentName: a2.departmentName,
            period1Value: val1,
            period2Value: val2,
            period1Threshold: a1.thresholdValue,
            period2Threshold: a2.thresholdValue,
            period1Severity: a1.severity,
            period2Severity: a2.severity,
            valueChanged,
            severityChanged,
            thresholdChanged,
            trend: this.computeTrend(val1, val2, code),
          });
        } else {
          unchanged.push({
            kriCode: code,
            kriName: a1.kriName,
            departmentName: a1.departmentName,
            value: val1,
            threshold: a1.thresholdValue,
            severity: a1.severity,
          });
        }
      }
    }

    return {
      period1: {
        year: period1.year,
        month: period1.month,
        totalRecords: alerts1.length,
      },
      period2: {
        year: period2.year,
        month: period2.month,
        totalRecords: alerts2.length,
      },
      summary: {
        added: added.length,
        removed: removed.length,
        changed: changed.length,
        unchanged: unchanged.length,
        total: allCodes.size,
      },
      added,
      removed,
      changed,
      unchanged,
    };
  }

  private computeTrend(val1: string, val2: string, kriCode: string): string {
    const n1 = parseFloat(String(val1).replace(/[^0-9.]/g, ''));
    const n2 = parseFloat(String(val2).replace(/[^0-9.]/g, ''));
    if (isNaN(n1) || isNaN(n2)) return 'unknown';
    const upperBound = /NPL|DOWNTIME|ALERT|ERROR|FAIL|LIMIT|DELAY/i.test(
      kriCode,
    );
    if (n2 > n1) return upperBound ? 'worse' : 'better';
    if (n2 < n1) return upperBound ? 'better' : 'worse';
    return 'stable';
  }

  // ==================== KRI BATCHES ====================

  async getKriBatches() {
    const allWithBatch = await this.kriRepository
      .createQueryBuilder('kri')
      .where('kri.uploadBatchId IS NOT NULL')
      .orderBy('kri.createdAt', 'DESC')
      .getMany();

    interface KriBatchRecord {
      uploadBatchId: string;
      createdAt: Date;
      reportMonth?: number;
      reportYear?: number;
      totalAlerts: number;
      files: Set<string>;
      departments: Set<string>;
      months: Set<string>;
    }

    const batches: Record<string, KriBatchRecord> = {};
    for (const alert of allWithBatch) {
      const batchId = alert.uploadBatchId;
      if (!batches[batchId]) {
        batches[batchId] = {
          uploadBatchId: batchId,
          createdAt: alert.createdAt,
          reportMonth: alert.reportMonth,
          reportYear: alert.reportYear,
          totalAlerts: 0,
          files: new Set<string>(),
          departments: new Set<string>(),
          months: new Set<string>(),
        };
      }
      batches[batchId].totalAlerts++;
      if (alert.sourceFileName)
        batches[batchId].files.add(alert.sourceFileName);
      if (alert.departmentName)
        batches[batchId].departments.add(alert.departmentName);
      if (alert.reportYear && alert.reportMonth) {
        batches[batchId].months.add(
          `${alert.reportYear}-T${alert.reportMonth}`,
        );
      }
    }

    return Object.values(batches).map((b: KriBatchRecord) => ({
      ...b,
      files: Array.from(b.files),
      fileCount: b.files.size,
      departments: Array.from(b.departments),
      months: Array.from(b.months),
    }));
  }

  async getKriOptions() {
    const dbYears = await this.kriRepository
      .createQueryBuilder('kri')
      .select('DISTINCT kri.reportYear', 'year')
      .getRawMany();

    const yearsSet = new Set<number>();
    dbYears.forEach((y) => {
      if (y.year) yearsSet.add(Number(y.year));
    });

    const currentYear = new Date().getFullYear();
    yearsSet.add(currentYear);
    yearsSet.add(currentYear - 1);
    yearsSet.add(currentYear + 1);
    yearsSet.add(2024);
    yearsSet.add(2025);
    yearsSet.add(2026);
    yearsSet.add(2027);

    const years = Array.from(yearsSet).sort((a, b) => a - b);

    return {
      years,
    };
  }
}
