import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as ExcelJS from 'exceljs';
import {
  DataIngestionBatch,
  IngestionSource,
  IngestionStatus,
} from './entities/data-ingestion-batch.entity';
import { DataPipelineService } from './data-pipeline.service';
import { DataWatcherService } from './data-watcher.service';
import { FastifyUploadedFile } from '../common/interceptors/fastify-file-interceptor';

@Injectable()
export class DataIngestionService {
  private readonly logger = new Logger(DataIngestionService.name);
  private readonly archiveDir: string;

  constructor(
    @InjectRepository(DataIngestionBatch)
    private readonly batchRepo: Repository<DataIngestionBatch>,
    private readonly pipelineService: DataPipelineService,
    private readonly watcherService: DataWatcherService,
  ) {
    this.archiveDir =
      process.env.RAW_DATA_ARCHIVE_DIR ||
      path.resolve(process.cwd(), 'uploads', 'raw_archive');
  }

  async getAllBatches(query: {
    dataSource?: IngestionSource;
    status?: IngestionStatus;
    periodDate?: string;
    limit?: number;
    page?: number;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const qb = this.batchRepo
      .createQueryBuilder('batch')
      .orderBy('batch.createdAt', 'DESC');

    if (query.dataSource) {
      qb.andWhere('batch.dataSource = :dataSource', {
        dataSource: query.dataSource,
      });
    }

    if (query.status) {
      qb.andWhere('batch.status = :status', { status: query.status });
    }

    if (query.periodDate) {
      qb.andWhere('batch.periodDate = :periodDate', {
        periodDate: query.periodDate,
      });
    }

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getBatchById(id: string): Promise<DataIngestionBatch> {
    const batch = await this.batchRepo.findOne({ where: { id } });
    if (!batch) {
      throw new NotFoundException(`Batch with ID ${id} not found`);
    }
    return batch;
  }

  /**
   * Handle Direct File Upload (Push API)
   */
  async handleFileUpload(
    file: FastifyUploadedFile,
    dataSource: IngestionSource = IngestionSource.API_PUSH,
    periodDate?: string,
    createdBy: string = 'USER_UPLOAD',
  ): Promise<DataIngestionBatch> {
    if (!file) {
      throw new Error('No file provided for data ingestion');
    }

    const fileHash = crypto
      .createHash('sha256')
      .update(file.buffer)
      .digest('hex');

    const now = new Date();
    const yyyy = now.getFullYear().toString();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const targetDir = path.join(this.archiveDir, yyyy, mm, dd);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const batchCode = `BATCH-${yyyy}${mm}${dd}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const destFilePath = path.join(
      targetDir,
      `${batchCode}_${file.originalname}`,
    );

    fs.writeFileSync(destFilePath, file.buffer);

    const batch = this.batchRepo.create({
      batchCode,
      dataSource,
      periodDate: periodDate || `${yyyy}-${mm}-${dd}`,
      fileName: file.originalname,
      rawFilePath: destFilePath,
      fileHash,
      status: IngestionStatus.QUEUED,
      createdBy,
      metadata: {
        fileSizeBytes: file.size,
        mimeType: file.mimetype,
        archivedAt: new Date().toISOString(),
      },
    });

    const savedBatch = await this.batchRepo.save(batch);

    // Run processing
    this.pipelineService
      .processBatch(savedBatch.id)
      .catch((err) =>
        this.logger.error(
          `Error processing uploaded batch ${batchCode}: ${err.message}`,
        ),
      );

    return savedBatch;
  }

  async reprocessBatch(id: string): Promise<DataIngestionBatch> {
    const batch = await this.getBatchById(id);
    batch.status = IngestionStatus.QUEUED;
    await this.batchRepo.save(batch);

    this.pipelineService
      .processBatch(batch.id)
      .catch((err) =>
        this.logger.error(
          `Error reprocessing batch ${batch.batchCode}: ${err.message}`,
        ),
      );

    return batch;
  }

  async triggerManualScan(user: string = 'ADMIN') {
    return this.watcherService.scanInbox(user);
  }

  async generateTemplate(type: 'transactions' | 'metrics'): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(
      type === 'transactions' ? 'Transactions' : 'Daily_Metrics',
    );

    if (type === 'transactions') {
      worksheet.columns = [
        { header: 'transactionCode', key: 'transactionCode', width: 22 },
        { header: 'accountId', key: 'accountId', width: 18 },
        { header: 'customerName', key: 'customerName', width: 25 },
        { header: 'vendorName', key: 'vendorName', width: 25 },
        { header: 'amount', key: 'amount', width: 18 },
        { header: 'transactionDate', key: 'transactionDate', width: 20 },
        { header: 'description', key: 'description', width: 35 },
      ];

      worksheet.addRow({
        transactionCode: 'TX-20260825-001',
        accountId: '10100987654',
        customerName: 'Công ty Cổ phần Xây dựng ABC',
        vendorName: 'Tổng kho Vật tư Miền Bắc',
        amount: 250000000,
        transactionDate: '2026-08-25 14:30:00',
        description: 'Thanh toán đợt 2 gói thầu vật tư kỹ thuật',
      });
      worksheet.addRow({
        transactionCode: 'TX-20260825-002',
        accountId: '10100987655',
        customerName: 'Khách hàng cá nhân Nguyễn Văn A',
        vendorName: '',
        amount: 85000000,
        transactionDate: '2026-08-25 22:15:00',
        description: 'Giải ngân hạn mức thấu chi cá nhân ngoài giờ',
      });
    } else {
      worksheet.columns = [
        { header: 'branchCode', key: 'branchCode', width: 16 },
        { header: 'metricDate', key: 'metricDate', width: 16 },
        { header: 'carRatio', key: 'carRatio', width: 14 },
        { header: 'nplRatio', key: 'nplRatio', width: 14 },
        { header: 'group2Ratio', key: 'group2Ratio', width: 14 },
        { header: 'llrRatio', key: 'llrRatio', width: 14 },
        { header: 'cirRatio', key: 'cirRatio', width: 14 },
        { header: 'nimRatio', key: 'nimRatio', width: 14 },
        { header: 'roaRatio', key: 'roaRatio', width: 14 },
        { header: 'roeRatio', key: 'roeRatio', width: 14 },
        { header: 'ldrRatio', key: 'ldrRatio', width: 14 },
        {
          header: 'liquidity30DaysRatio',
          key: 'liquidity30DaysRatio',
          width: 22,
        },
      ];

      worksheet.addRow({
        branchCode: 'CN_HANOI',
        metricDate: '2026-08-25',
        carRatio: 12.8,
        nplRatio: 1.65,
        group2Ratio: 2.1,
        llrRatio: 155.0,
        cirRatio: 41.2,
        nimRatio: 3.8,
        roaRatio: 1.8,
        roeRatio: 19.5,
        ldrRatio: 77.2,
        liquidity30DaysRatio: 120.5,
      });
      worksheet.addRow({
        branchCode: 'CN_HCM',
        metricDate: '2026-08-25',
        carRatio: 11.5,
        nplRatio: 3.4,
        group2Ratio: 5.2,
        llrRatio: 95.0,
        cirRatio: 48.5,
        nimRatio: 3.2,
        roaRatio: 1.2,
        roeRatio: 14.0,
        ldrRatio: 84.0,
        liquidity30DaysRatio: 92.0,
      });
    }

    // Format header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF593116' },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
